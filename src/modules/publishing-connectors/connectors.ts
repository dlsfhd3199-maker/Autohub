import type { ConnectorConfiguration, PublicationRequest, PublicationResult, PublishingConnector } from "./contracts";

const unavailable = (code: PublicationResult["code"]): PublicationResult => ({ ok: false, code });
const connected = (configuration: ConnectorConfiguration) => configuration.status === "connected";

export class LocalTestStoreConnector implements PublishingConnector {
  readonly id = "local-test-store" as const;
  constructor(private readonly operation: (kind: "publish" | "update" | "unpublish" | "inspect", request: PublicationRequest | string) => Promise<PublicationResult> = async (kind, request) => typeof request === "string" ? { ok: true, code: kind === "unpublish" ? "UNPUBLISHED" : "UPDATED" } : { ok: true, code: kind === "publish" ? "PUBLISHED" : "UPDATED", externalId: request.document.contentId, externalUrl: request.document.canonical, contentHash: request.document.contentHash }) {}
  validateConfiguration(configuration: ConnectorConfiguration) { return connected(configuration) ? { valid: true, safeCode: "READY" } : { valid: false, safeCode: configuration.status === "disabled" ? "CONNECTION_DISABLED" : "NOT_CONFIGURED" }; }
  async verifyConnection(configuration: ConnectorConfiguration) { return { status: configuration.status, safeCode: this.validateConfiguration(configuration).safeCode }; }
  async listPublishingTargets(configuration: ConnectorConfiguration) { return connected(configuration) ? [{ id: configuration.defaultTarget ?? "blog", label: "로컬 테스트몰 블로그" }] : []; }
  async publish(configuration: ConnectorConfiguration, request: PublicationRequest) { return connected(configuration) ? this.operation("publish", request) : unavailable(configuration.status === "disabled" ? "CONNECTION_DISABLED" : "NOT_CONFIGURED"); }
  async update(configuration: ConnectorConfiguration, request: PublicationRequest) { return connected(configuration) ? this.operation("update", request) : unavailable("NOT_CONFIGURED"); }
  async unpublish(configuration: ConnectorConfiguration, externalId: string) { return connected(configuration) ? this.operation("unpublish", externalId) : unavailable("NOT_CONFIGURED"); }
  async inspectPublication(configuration: ConnectorConfiguration, externalId: string) { return connected(configuration) ? this.operation("inspect", externalId) : unavailable("NOT_CONFIGURED"); }
  getCapabilities() { return ["publish", "update", "unpublish", "inspect", "targets"] as const; }
}

export class HtmlExportConnector implements PublishingConnector {
  readonly id = "html-export" as const;
  validateConfiguration(configuration: ConnectorConfiguration) { return configuration.status === "disabled" ? { valid: false, safeCode: "CONNECTION_DISABLED" } : { valid: true, safeCode: "READY" }; }
  async verifyConnection(configuration: ConnectorConfiguration) { return { status: configuration.status === "disabled" ? "disabled" as const : "connected" as const, safeCode: this.validateConfiguration(configuration).safeCode }; }
  async listPublishingTargets() { return [{ id: "download", label: "안전한 HTML 내보내기" }]; }
  async publish(configuration: ConnectorConfiguration, request: PublicationRequest) { return this.validateConfiguration(configuration).valid ? { ok: true, code: "EXPORTED" as const, html: request.document.bodyHtml, contentHash: request.document.contentHash } : unavailable("CONNECTION_DISABLED"); }
  update(configuration: ConnectorConfiguration, request: PublicationRequest) { return this.publish(configuration, request); }
  async unpublish() { return unavailable("UNSUPPORTED_OPERATION"); }
  async inspectPublication() { return unavailable("UNSUPPORTED_OPERATION"); }
  getCapabilities() { return ["publish", "update", "html_export"] as const; }
}

abstract class OfflinePlaceholder implements PublishingConnector {
  abstract readonly id: "cafe24" | "custom-api";
  validateConfiguration() { return { valid: false, safeCode: this.id === "cafe24" ? "CONNECTOR_NOT_INSTALLED" : "NOT_CONFIGURED" }; }
  async verifyConnection() { return { status: this.id === "cafe24" ? "not_installed" as const : "not_configured" as const, safeCode: this.validateConfiguration().safeCode }; }
  async listPublishingTargets() { return []; }
  async publish() { return unavailable(this.id === "cafe24" ? "CONNECTOR_NOT_INSTALLED" : "NOT_CONFIGURED"); }
  async update() { return this.publish(); }
  async unpublish() { return this.publish(); }
  async inspectPublication() { return this.publish(); }
  getCapabilities() { return [] as const; }
}
export class Cafe24PlaceholderConnector extends OfflinePlaceholder { readonly id = "cafe24" as const; }
export class CustomApiPlaceholderConnector extends OfflinePlaceholder { readonly id = "custom-api" as const; }
