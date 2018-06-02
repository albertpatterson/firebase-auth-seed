import './css/app.css'
import '../../node_modules/firebaseui/dist/firebaseui.css'

const firebase = require("firebase/app");
require("firebase/database");
const firebaseui = require('firebaseui');

const gauth_config = require("./not_shared/config/googleConfig");

const firebaseConfig =require("./not_shared/config/firebaseConfig");
firebase.initializeApp(firebaseConfig);

const firebaseUIConfig = {
  signInSuccessUrl: document.location.href,
  signInOptions: [
    {provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      scopes: [gauth_config.scope],
      customParameters: {
        prompt: 'select_account'
      }}
  ],
  tosUrl: 'http://localhost:12003/'
};
const firebaseUI = new firebaseui.auth.AuthUI(firebase.auth());
firebaseUI.start('#sign-in-container', firebaseUIConfig);

window.addEventListener('load', initApp);
function initApp() {
  firebase.auth().onAuthStateChanged(function(user){
    if(user){
      user.getIdToken()
      .then(token=>updateUserData(user, token))
      .then(showFirebaseData)
      .then(load_gapi)
      .then(loadAuthClient)
      .then(authorize_gapi)
      .then(loadDiscoveryDocs)
      .then(showGoogleDriveFiles)
      .then(showSignedIn)
    }else{
      resetUserData();
      showSignedOut();
    }
  })
}

const userDataFields = ["displayName", "email", "emailVerified", "uid", "phoneNumber",  "providerData"];
const userDataEls = userDataFields.map(field=>document.getElementById(field));
const userphotoEl = document.getElementById("photo");
const userTokenEl = document.getElementById("token");
function updateUserData(firebaseUser, token){
  userDataFields.forEach((field, i)=>userDataEls[i].innerText=firebaseUser[field]);
  userphotoEl.src = firebaseUser.photoURL || "#";
  userTokenEl.innerText = token;
}

function showFirebaseData(){
  return new Promise(r=> {
    firebase.database().ref("visitor").once("value").then(snapshot => {
      updateFirebaseMessage(snapshot.child("message").val());
      r()
    });
  })
}

const firebaseMessageEl = document.getElementById("firebase-message");
function updateFirebaseMessage(message){
  firebaseMessageEl.innerText = message;
}

function load_gapi(){
  return new Promise((res, rej)=>{
    let loaded = false;
    let script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload=res;
    script.onerror=rej;
    document.head.appendChild(script);
  });
}

function loadAuthClient(){
  return new Promise((res, rej)=>{
    gapi.load('client:auth2', e=>e?rej(e):res())
  })
}

function authorize_gapi(){
  return new Promise((res, rej)=>{
    gapi.auth2.authorize({
      client_id: gauth_config.clientId,
      scope: gauth_config.scope,
      response_type: 'id_token permission',
      prompt: 'none',
    }, function(resp){
      if(resp.error){
        rej(resp.error);
      }else{
        res(resp);
      }
    })
  })
}

function loadDiscoveryDocs(){
  return gauth_config.discoveryDocs.reduce(
    (loadPrevious, doc) => loadPrevious.then(() => gapi.client.load(doc)),
    Promise.resolve());
}

function showGoogleDriveFiles(){
  return new Promise(retrieveSomeFiles)
  .then(updateFileList);
}

function retrieveSomeFiles(onSuccess) {
  const retrievePageOfFiles = function (request, result) {
    request.execute(function (resp) {
      result = result.concat(resp.files);
      onSuccess(result);
    });
  };
  const initialRequest = gapi.client.drive.files.list();
  retrievePageOfFiles(initialRequest, []);
}

const fileList = document.getElementById("file-list");
function updateFileList(files){
  [].forEach.call(fileList.children,c=>fileList.removeChild(c));
  files.forEach(file=>{
    const el = document.createElement("div");
    el.innerText = file.name;
    fileList.appendChild(el);
  })
}

function resetUserData(){
  updateUserData({});
  updateFileList([]);
  userDataEl.classList.remove("showing");
}

const signInCont = document.getElementById("sign-in-container");
const signOutCont = document.getElementById("sign-out-container");
const userDataEl = document.getElementById("user-data");
function showSignedIn(){
  signInCont.classList.remove("showing");
  signOutCont.classList.add("showing");
  userDataEl.classList.add("showing");
}

function showSignedOut(){
  signInCont.classList.add("showing");
  signOutCont.classList.remove("showing");
  userDataEl.classList.remove("showing");
}

// register listeners
document.getElementById('signOut').addEventListener('click', function(event) {
  firebase.auth().signOut();
  resetUserData();
});
