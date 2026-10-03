import {bindQuestionPlaceSearch} from './question-place-search.mjs';
function bind(){
  bindQuestionPlaceSearch('birthPlace');
  bindQuestionPlaceSearch('privateConsultBirthPlace');
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
