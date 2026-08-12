import { Cafe24BoardBlogPlaceholderConnector, Cafe24PlaceholderConnector, CustomApiPlaceholderConnector, HtmlExportConnector, LocalTestStoreConnector } from "./connectors";
import type { PublishingConnector, PublishingConnectorId } from "./contracts";

export const publishingConnectorRegistry: Readonly<Record<PublishingConnectorId, PublishingConnector>> = {
  "local-test-store": new LocalTestStoreConnector(),
  "html-export": new HtmlExportConnector(),
  cafe24: new Cafe24PlaceholderConnector(),
  "cafe24-board-blog": new Cafe24BoardBlogPlaceholderConnector(),
  "custom-api": new CustomApiPlaceholderConnector(),
} as const;
export function getPublishingConnector(id: PublishingConnectorId) { return publishingConnectorRegistry[id]; }
export function listPublishingConnectors() { return Object.values(publishingConnectorRegistry).map((connector) => ({ id: connector.id, capabilities: connector.getCapabilities() })); }
