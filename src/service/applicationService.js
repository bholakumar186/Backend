import { createApplication } from '../models/application.js';

export async function submitApplication(appData) {
  if (!appData.email || !appData.name)
    throw new Error('Name and email are required.');

  return await createApplication(appData);
}
