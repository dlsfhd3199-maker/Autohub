import type { PublishDocument } from "@/modules/publish-document/schema";

export type PublishingConnectorId = "local-test-store" | "html-export" | "cafe24" | "custom-api";
export type PublishingCapability = "publish" | "update" | "unpublish" | "inspect" | "targets" | "html_export";
export type ConnectorStatus = "connected" | "not_configured" | "disabled" | "error" | "not_installed";
export type ConnectorConfiguration = { status: ConnectorStatus; publicDomain?: string; credentialReference?: string; defaultTarget?: string };
export type PublicationResult = { ok: boolean; code: "PUBLISHED" | "UPDATED" | "UNPUBLISHED" | "EXPORTED" | "CONNECTOR_NOT_INSTALLED" | "NOT_CONFIGURED" | "CONNECTION_DISABLED" | "UNSUPPORTED_OPERATION"; externalId?: string; externalUrl?: string; contentHash?: string; html?: string };
export type PublicationRequest = { document: PublishDocument; target: string; idempotencyKey: string };

export interface PublishingConnector {
  readonly id: PublishingConnectorId;
  validateConfiguration(configuration: ConnectorConfiguration): { valid: boolean; safeCode: string };
  verifyConnection(configuration: ConnectorConfiguration): Promise<{ status: ConnectorStatus; safeCode: string }>;
  listPublishingTargets(configuration: ConnectorConfiguration): Promise<Array<{ id: string; label: string }>>;
  publish(configuration: ConnectorConfiguration, request: PublicationRequest): Promise<PublicationResult>;
  update(configuration: ConnectorConfiguration, request: PublicationRequest): Promise<PublicationResult>;
  unpublish(configuration: ConnectorConfiguration, externalId: string): Promise<PublicationResult>;
  inspectPublication(configuration: ConnectorConfiguration, externalId: string): Promise<PublicationResult>;
  getCapabilities(): readonly PublishingCapability[];
}
