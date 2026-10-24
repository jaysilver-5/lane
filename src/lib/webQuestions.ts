import { downloadContentPack, downloadFreeQuestions, type ContentPack } from './content';

export const completeQuestionsUnavailable = 'Your Complete questions are unavailable right now. Your purchase and saved progress are safe. Please try again later or contact support.';

// Web content is loaded for the current authenticated visit. It never depends
// on an installed pack or uses a device cache as paid authorization.
export type BankAvailability = 'loading' | 'samples' | 'complete' | 'awaiting-review' | 'error';
export async function loadWebQuestions(userId: string, paid: boolean, onSamples?: (pack: ContentPack) => void): Promise<{ pack: ContentPack; error: string; availability: BankAvailability }> {
  if (!paid) return { pack: await downloadFreeQuestions(userId), error: '', availability: 'samples' };
  let completeReady = false;
  const samples = downloadFreeQuestions(userId).then(pack => {
    if (!completeReady) onSamples?.(pack);
    return pack;
  }).catch(() => null);
  let unpublished = false;
  try {
    const pack = await downloadContentPack(userId);
    if (!pack.approved || pack.questions.length !== 500) throw new Error('Incomplete question bank');
    completeReady = true;
    return { pack, error: '', availability: 'complete' };
  } catch (error) { unpublished = (error as {code?: string})?.code === 'content_not_published'; }
  const pack = await samples;
  if (pack) return { pack, error: unpublished ? '' : 'The full bank could not load. You can keep practising the available samples.', availability: unpublished ? 'awaiting-review' : 'error' };
  throw new Error('Your questions could not load. Check your connection and try again. Your purchase and saved progress are safe.');
}
