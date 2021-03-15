// https://stackoverflow.com/questions/41698357/how-to-partition-input-field-to-appear-as-separate-input-fields-on-screen

/*  This is for switching back and forth the input box for user experience */
const inputs = document.querySelectorAll('#OTPInput > *[id]');
inputs[0].addEventListener('keydown', function (event) {
    if (event.key === "Backspace") {
        inputs[0].value = '';
    } else if (event.key === "ArrowRight") {
        inputs[1].focus();
    }
});
inputs[0].addEventListener('input', function (event) {
    inputs[0].value = inputs[0].value.toUpperCase();
    updateCode();
    if (inputs[0].value !== '') {
        inputs[1].focus();
    }
});
inputs[1].addEventListener('keydown', function (event) {
    if (event.key === "Backspace") {
        inputs[1].value = '';
    } else if (event.key === "ArrowRight") {
        inputs[2].focus();
    }
    else if (event.key === "ArrowLeft") {
        inputs[0].focus();
    }
});
inputs[1].addEventListener('input', function (event) {
    inputs[1].value = inputs[1].value.toUpperCase();
    updateCode();
    if (inputs[1].value !== '') {
        inputs[2].focus();
    }
});

inputs[2].addEventListener('keydown', function (event) {
    if (event.key === "Backspace") {
        inputs[2].value = '';
    } else if (event.key === "ArrowRight") {
        inputs[3].focus();
    }
    else if (event.key === "ArrowLeft") {
        inputs[1].focus();
    }
});
inputs[2].addEventListener('input', function (event) {
    inputs[2].value = inputs[2].value.toUpperCase();
    updateCode();
    if (inputs[2].value !== '') {
        inputs[3].focus();
    }
});

inputs[3].addEventListener('keydown', function (event) {
    if (event.key === "Backspace") {
        inputs[3].value = '';
    }
    else if (event.key === "ArrowLeft") {
        inputs[2].focus();
    }
});
inputs[3].addEventListener('input', function (event) {
    inputs[3].value = inputs[3].value.toUpperCase();
    updateCode();
});

/*  This is to get the value on pressing the submit button
*   In this example, I used a hidden input box to store the otp after compiling data from each input fields
*   This hidden input will have a name attribute and all other single character fields won't have a name attribute
*   This is to ensure that only this hidden input field will be submitted when you submit the form */


var joinButton = document.getElementById('joinBtn');
function updateCode() {
    let compiledOtp = '';
    for (let i = 0; i < inputs.length; i++) {
        compiledOtp += inputs[i].value;
    }
    document.getElementById('joincode').value = compiledOtp;
    return true;
}
