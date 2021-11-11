// create variable to hold db connection
let db;
// establish a connection to IndexedDB database called 'budget_tracker' and set it to version 1
const request = indexedDB.open("budget_tracker", 1);

// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
  // save a reference to the database
  const db = event.target.result;
  // create an object store (table) called `new_transcation`, set it to have an auto incrementing primary key of sorts
  db.createObjectStore("new_transaction", { autoIncrement: true });
};

request.onsuccess = function (event) {
  db = event.target.result;

  // check if app is online, if yes run uploadBargain() function to send all local db data to api
  if (navigator.onLine) {
    uploadTransaction();
  }
};

request.onerror = function (event) {
  // log error here
  console.log(event.target.errorCode);
};

// This function will be executed if we attempt to submit a new transaction and there's no internet connection
function saveRecord(record) {
  // open a new transaction with the database with read and write permissions
  const transaction = db.transaction(["new_transaction"], "readwrite");

  // access the object store for `new_transaction`
  const transactionObjectStore = transaction.objectStore("new_transaction");

  // add record to your store with add method
  transactionObjectStore.add(record);
}

// Function to upload using fetch API
function uploadTransaction() {
  // open a new transaction with the database with read and write permissions
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access the object store for `new_transaction`
  const transactionObjectStore = transaction.objectStore('new_transaction');

  const getAll = transactionObjectStore.getAll();

  getAll.onsuccess = function() {
      if(getAll.result.length > 0) {                 
          fetch('/api/transaction/bulk', {
              method: 'POST',
              body: JSON.stringify(getAll.result),
              headers: {
                  Accept: 'application/json, text/plain, */*',
                  'Content-Type': 'application/json'
              }
          }).then(response => response.json())
          .then(serverResponse => {
              if(serverResponse.message) {
                  throw new Error(serverResponse);
              }

              const transaction = db.transaction(['new_transaction'], 'readwrite');           // After data is uploaded to remote DB clear indexedDB

              const transactionObjectStore = transaction.objectStore('new_transaction');

              transactionObjectStore.clear();

              console.log('All saved transactions have been submitted!');
          }).catch(err => {
              console.log(err);
          });
      }
  }
};

// Event listener to listen is online connectivity is restored
window.addEventListener('online', uploadTransaction);