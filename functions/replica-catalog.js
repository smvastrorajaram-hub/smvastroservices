'use strict';

// Explicit allowlist of top-level, read-only Project 2 replica collections.
// Identity, authorization, Wallet and financial collections are deliberately excluded.
const PROJECT2_REPLICA_COLLECTIONS = Object.freeze([
  'smv_questions',
  'smv_private_consultations',
  'smv_astrologers',
  'smv_reviews',
  'smv_notifications',
  'smv_astrologer_quiz_questions'
]);
const DASHBOARD_READ_REPLICA_COLLECTIONS = Object.freeze([
  'smv_astrologers','smv_reviews','smv_notifications','smv_astrologer_quiz_questions'
]);
const ALLOWLIST = new Set(PROJECT2_REPLICA_COLLECTIONS);
const PROJECTS = Object.freeze({
  primary:'smv-astro', consultations:'astro-service-ae9e7',
  liveData:'smv-astro-services', content:'svm-astro',
  walletDomain:'smvastro-services', stagingPrimary:'smv-astro-staging'
});
const PRODUCTION_SECONDARY_PROJECT_IDS = Object.freeze([
  PROJECTS.consultations,PROJECTS.liveData,PROJECTS.content,PROJECTS.walletDomain
]);
function isProject2ReplicaCollection(name){return ALLOWLIST.has(String(name||''));}
function project2ReadCandidates({primaryDb,replicaDb,multiProjectEnabled=false,backfillComplete=false,collectionName}={}){
 if(!primaryDb)throw new TypeError('project2ReadCandidates requires primaryDb.');
 const candidates=[{id:'project1-primary',db:primaryDb}];
 if(multiProjectEnabled===true&&backfillComplete===true&&isProject2ReplicaCollection(collectionName)&&replicaDb&&replicaDb!==primaryDb)
  candidates.push({id:'project2-verified-replica',db:replicaDb});
 return candidates;
}
module.exports={PROJECT2_REPLICA_COLLECTIONS,DASHBOARD_READ_REPLICA_COLLECTIONS,PROJECTS,PRODUCTION_SECONDARY_PROJECT_IDS,isProject2ReplicaCollection,project2ReadCandidates};
