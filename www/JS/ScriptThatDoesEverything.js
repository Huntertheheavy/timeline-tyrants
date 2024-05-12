
function Endturn(){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if (this.readyState == 4){
            var response = JSON.parse(this.responseText)
            console.log(response)
            if (response.authenticated){
                document.getElementById("Status").innerHTML = "You Skipped your Turn";
            }
        }
    xhttp.open("Put","/EndATurn",true);
    xhttp.send();
    }
}
function Attack(){
    var xhttp = new XMLHttpRequest();
    YourTurn = false
    xhttp.onreadystatechange = function(){
        if (this.readyState == 4){
            var response = JSON.parse(this.responseText)
            console.log(response)
            if (response.authenticated){
                
            }
        }
    xhttp.open("Put","/AttackUnit",true);
    xhttp.send();
    }
}

function Attack(){
    if (YourTurn == true){
    var xhttp = new XMLHttpRequest();
    YourTurn = false
    xhttp.onreadystatechange = function(){
        if (this.readyState == 4){
            var response = JSON.parse(this.responseText)
            console.log(response)
            if (response.authenticated){
                
            }
        }
    }
    xhttp.open("Put","/AttackUnit",true);
    xhttp.send();
    }
}
setInterval(TimeFunc,3000)
function TimeFunc(){
    console.log("Hello?")
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function(){
        if (this.readyState == 4){
            var response = JSON.parse(this.responseText)
            console.log(response)
            if (response.authenticated){
                document.getElementById("Role").innerHTML = response.Role;
                document.getElementById("TurnNumber").innerHTML = "Turn: "+ response.Turn;
                document.getElementById("Resources").innerHTML = response.Resources;
            }
        }
    console.log("Hello?")
    }
    xhttp.open("GET","/GetTurn",true);
    xhttp.send();
}