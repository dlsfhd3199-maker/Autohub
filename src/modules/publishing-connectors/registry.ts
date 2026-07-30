import { Cafe24PlaceholderConnector, CustomApiPlaceholderConnector, HtmlExportConnector, LocalTestStoreConnector } from "./connectors";
import type { PublishingConnector, PublishingConnectorId } from "./contracts";

export const publishingConnectorRegistry: Readonly<Record<PublishingConnectorId, PublishingConnector>> = {
  "local-test-store": new LocalTestStoreConnector(),
  "html-export": new HtmlExportConnector(),
  cafe24: new Cafe24PlaceholderConnector(),
  "custom-api": new CustomApiPlaceholderConnector(),
} as const;
export function getPublishingConnector(id: PublishingConnectorId) { return publishingConnectorRegistry[id]; }
export function listPublishingConnectors() { return Object.values(publishingConnectorRegistry).map((connector) => ({ id: connector.id, capabilities: connector.getCapabilities() })); }
