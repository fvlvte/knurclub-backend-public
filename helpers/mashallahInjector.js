(() => {
  const masallahReuqestData = {
    url: "###URL###",
    method: "###METHOD###",
  };

  const mashallahFeedbackData = {
    requestId: "###REQUEST_ID###",
  };

  fetch(masallahReuqestData.url, {
    method: masallahReuqestData.method,
    headers: {
      ...masallahReuqestData.headers,
      authorization: _localStorage.getItem("token").replace(/"/g, ""),
    },
  })
    .then((response) => {
      response.json().then((data) => {
        const url = `http://127.0.0.1/core/delayed?requestId=${
          mashallahFeedbackData.requestId
        }&data=${encodeURIComponent(JSON.stringify(data))}`;
        fetch(url, { method: "GET" })
          .then((_response) => {
            console.log("OK");
          })
          .catch((error) => {
            console.error(error);
          });
      });
    })
    .catch((error) => {
      console.error(error);
    });
})();
