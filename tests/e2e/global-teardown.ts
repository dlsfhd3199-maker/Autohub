import { resetAndPrepareAcceptanceFixture } from "../../scripts/local-acceptance-fixture.mjs";

export default async function teardown() {
  const publishingKey = process.env.E2E_PUBLISHING_KEY;
  if (!publishingKey) throw new Error("Ephemeral E2E publishing key is required for local fixture recovery");
  await resetAndPrepareAcceptanceFixture(publishingKey);
}
