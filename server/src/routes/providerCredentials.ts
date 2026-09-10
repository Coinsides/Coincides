import { Router, type Response } from 'express';
import {
  clearProviderCredential,
  isCredentialProvider,
  listProviderCredentialStatuses,
  ProviderCredentialError,
  saveProviderCredential,
  testProviderConnection,
} from '../services/providerCredentials.js';

export const providerCredentialsRouter = Router();

function sendStoreError(res: Response, error: unknown): void {
  if (error instanceof ProviderCredentialError) {
    res.status(error.code === 'invalid_request' ? 400 : 503).json({ error: error.message, code: error.code });
    return;
  }
  res.status(503).json({ error: 'Provider credential storage is unavailable.', code: 'store_unavailable' });
}

providerCredentialsRouter.param('provider', (_req, res, next, provider: string) => {
  if (!isCredentialProvider(provider)) {
    res.status(400).json({ error: 'Unknown provider.', code: 'invalid_request' });
    return;
  }
  next();
});

providerCredentialsRouter.get('/', (_req, res) => {
  try {
    res.json({ providers: listProviderCredentialStatuses() });
  } catch (error) {
    sendStoreError(res, error);
  }
});

providerCredentialsRouter.put('/:provider', (req, res) => {
  try {
    res.json(saveProviderCredential(req.params.provider as string, req.body?.api_key));
  } catch (error) {
    sendStoreError(res, error);
  }
});

providerCredentialsRouter.delete('/:provider', (req, res) => {
  try {
    res.json(clearProviderCredential(req.params.provider as string));
  } catch (error) {
    sendStoreError(res, error);
  }
});

providerCredentialsRouter.post('/:provider/test-connection', async (req, res) => {
  const { model, base_url } = req.body || {};
  if ((model !== undefined && typeof model !== 'string') || (base_url !== undefined && typeof base_url !== 'string')) {
    res.status(400).json({ success: false, category: 'invalid_request' });
    return;
  }
  try {
    res.json(await testProviderConnection(req.params.provider as string, { model, base_url }));
  } catch (error) {
    sendStoreError(res, error);
  }
});

export default providerCredentialsRouter;
