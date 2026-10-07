import { authenticatedClient } from './supabase';
import { mergeProgress } from '../domain/progress.mjs';
import type { LearnerState } from '../domain/types';
export async function syncProgress(userId:string,state:LearnerState){
 const {client}=await authenticatedClient(userId);
 // Optimistic concurrency: a second device cannot silently overwrite a newer snapshot.
 for(let attempt=0;attempt<3;attempt++){
  const {data:remote,error}=await client.from('beta_progress').select('snapshot,updated_at').eq('user_id',userId).maybeSingle();if(error)throw error;
  const snapshot=mergeProgress(remote?.snapshot||{},state);
  const {data:result,error:writeError}=await client.rpc('firstlane_save_progress',{p_snapshot:snapshot,p_expected_updated_at:remote?.updated_at||null});if(writeError)throw writeError;
  if(result?.saved)return snapshot;
 }
 throw new Error('Your progress changed on another device. Please sync again. Your local history is safe.');
}
