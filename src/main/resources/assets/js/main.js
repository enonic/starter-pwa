require('../css/styles.less');

(function(){

    const geoLocationApiUrl = 'http://ip-api.com/json';
    const defaultCity = 'Samara';

    var app = {
        currentCity: defaultCity
    };

    app.container = document.getElementById('pwa-container');

    function showMessage(message) {
        app.container.innerHTML = message;
    }

    function showErrorMessage(error) {
        console.log(error);
        showMessage(`Failed to determine current city. Showing forecast for ${defaultCity}`);
    }
    
    function status(response) {
        return response.ok ? Promise.resolve(response.json()) : Promise.reject(new Error(response.statusText));
    }

    function parseJson(json) {
        if (json.status == "success" && json.city) {
            app.currentCity = json.city;
            showMessage(`Current city is ${app.currentCity}`);

            return Promise.resolve();
        }

        return Promise.reject(new Error(json.message))
    }

    app.fetchCurrentLocation = async () => {

        fetch(geoLocationApiUrl)
            .then(status)
            .then(parseJson)
            .catch(showErrorMessage);

    };

    (function() {
        showMessage(`Current city is ${app.currentCity}`);
        
        app.fetchCurrentLocation();
    })();
})();