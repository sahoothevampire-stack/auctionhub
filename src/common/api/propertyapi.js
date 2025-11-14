import config from "../constants";

const _request = async (type, url, formData) => {
    //get/post API
    const ls = JSON.parse(localStorage.getItem('persist:root'));
    console.log('ls: ', ls);
    const loginData = ls && ls.auth? JSON.parse(ls.auth) : '';
    // console.log('loginData: ', loginData);
    let token = loginData ? loginData.access_token : "";
    // console.log('token: ', token);
    let API_URL = config.API_URL + url;
    if (type === 'GET') {
        if (formData) {
            API_URL += formData;
        }
        try {
            let response = await fetch(API_URL, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token ? "bearer " + token : "",
                },
            }).then(data => data.json());
            // console.log('API response: ', response.result);
            return response;
        } catch (error) {
            console.log('ERROR response: ', error);
        }
    }
    if (type === 'POST') {
        try {
            let response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token ? "bearer " + token : "",
                },
                body: JSON.stringify(formData),
            }).then(data => data.json());
            console.log('API response: ', response);
            return response;
        } catch (error) {
            console.log('ERROR response: ', error);
        }
    }
}

// File upload method for multipart/form-data (e.g., file uploads)
const _requestFile = async (type, url, file, userId) => {
    const ls = JSON.parse(localStorage.getItem('persist:root'));
    const loginData = ls && ls.auth ? JSON.parse(ls.auth) : '';
    let token = loginData ? loginData.access_token : "";
    
    let API_URL = config.API_URL + url;
    
    if (type === 'POST') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            
            let response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Authorization": token ? "bearer " + token : "",
                },
                body: formData,
            }).then(data => data.json());
            console.log('File upload response: ', response);
            return response;
        } catch (error) {
            console.log('ERROR file upload response: ', error);
            throw error;
        }
    }
}

export default _request;
export { _requestFile };