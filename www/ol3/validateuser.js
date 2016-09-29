  function validateuser(code, callback)
  {
    var xhr = new XMLHttpRequest();
    var formData = 'email=' + encodeURIComponent(localStorage.email) + '&validationcode=' + encodeURIComponent(code);
    xhr.open("POST", server+"/photoserver/validateuser");
    xhr.setRequestHeader("Content-Type","application/x-www-form-urlencoded; charset=UTF-8");
    xhr.onreadystatechange = function (event) {
       if (xhr.readyState === 4) {
           if (xhr.status === 200) {
             if (xhr.responseText.length != 32) {
                callback ("Validation failed: " + xhr.responseText);
             } else {
               localStorage.hash = xhr.responseText;
               callback (null, "Validation ok!")
             }
           } else {
              callback ("Request error, http status: " + xhr.status + ", statusText: " + xhr.statusText);
           }
       }
    };
    xhr.send(formData);
  }

  function checkValidationCode(code)
  {
    var status = document.querySelector('#status');
    status.innerHTML = "validating..."
    
    validateuser(code, function(err, result){
      if (err) {
        status.innerHTML = err;
        setTimeout(function() {
          window.location = "validateuser.html";
        }, 5000);
      } else {
        status.innerHTML = result;
        setTimeout(function() {
          window.location = "index.html";
        }, 5000);
      }
    });
  }

  function setupForm()
  {
    skipbutton = document.getElementById("skipbutton");
    skipbutton.addEventListener('click', function() {
      localStorage.hash = 'skipped';
      window.location = 'index.html';
    })


    savebutton = document.getElementById("savebutton");
    savebutton.addEventListener('click', function() {
      if (this.classList.contains('disabled')) {
        return;
      }
      var code = codefield.value.trim().toLowerCase();
      checkValidationCode(code);
    })

    function isValidCode(code) {
      var re = /^([0-9]{5})$/;
      return re.test(code.trim());
    }

    codefield = document.getElementById('validationcode');
    codefield.addEventListener('input', function() {
      var code = codefield.value;
      if (isValidCode(code)) {
        savebutton.classList.remove("disabled");
      } else {
        savebutton.classList.add("disabled");
      }
    });

  }
