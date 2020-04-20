"use strict";

// Initialize Firebase!
var config = {
    apiKey: "AIzaSyDn6s-P6h6MB-PKXKRaBHFvkaPBbyKssLg",
    authDomain: "cult-game.firebaseapp.com",
    databaseURL: "https://cult-game.firebaseio.com",
    storageBucket: "cult-game.appspot.com",
    messagingSenderId: "718126583517"
};
firebase.initializeApp(config);

var firebaseCodec = {
    // firebase does not allow in keys: ".", "#", "$", "/", "[", or "]"
	encodeFully: function(s) {
		return encodeURIComponent(s).replace(/\./g, '%2E');
	},
	decode: function(s) {
		return decodeURIComponent(s);
	}
};

var session={
    challenge_name:"",
	user: "",
	timestamp: "0000-00-00 00:00",
    level: "normal",
    beat: 0,
    beat_timeout: null,
    last_zombies_beat:{},
    zombies_to_kill:[],
    challenge:null,
    game:{
        cm:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        tmpError:""
    }
    /*,
    last_zombie_check: 0,
	num_correct: 0,
	num_answered: 0,
	result: 0,
    action: 'send_session_post',
	details: []*/
};


var activity_timer=new ActivityTimer();


var canvas_zone_vcentered=document.getElementById('zone_canvas_vcentered');



function menu_screen(){
	allowBackExit();
    console.log('menu screen');
	var splash=document.getElementById("splash_screen");
	if(splash!=null){ splash.parentNode.removeChild(splash); }

	console.log('menu_screen user: ('+session.user+')');
    canvas_zone_vcentered.innerHTML=' \
    <div id="menu-logo-div"></div> \
    <nav id="responsive_menu">\
    <br /><button id="create-button" class="coolbutton">Crear partida</button> \
    <br /><button id="join-button" class="coolbutton">Unirse a partida</button>\
    </nav>\
    ';
    document.getElementById("create-button").addEventListener(clickOrTouch,function(){challenge_form('crear');});
    document.getElementById("join-button").addEventListener(clickOrTouch,function(){challenge_form('unirse');});
    /*if(indicator_list.length==0){
        indicator_list=Object.keys(data_map);
        indicator_list.splice(indicator_list.indexOf('history'));
    } 
    if(country_list.length==0) load_country_list_from_indicator('population');
    if(period_list.length==0) load_period_list_from_indicator_ignore_last_year('population');
    if(fact_list.length==0) load_fact_list_and_map();
	*/
}


function challenge_form(type){
    canvas_zone_vcentered.innerHTML=' \
          Nombre partida: <input id="challenge_name" pattern="[a-zA-Z0-9]+" /><br />\
          Nombre jugador: <input id="jugador" pattern="[a-zA-Z0-9]+" value="'+session.user+'" /><br />\
        <button id="'+type+'">'+type+'</button>\
        <br /><button id="go-back" class="minibutton fixed-bottom-right go-back">&lt;</button> \
        ';
    document.getElementById("challenge_name").addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            document.getElementById("jugador").focus();
        }
    });
    document.getElementById("jugador").addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            document.getElementById(type).click();
        }
    });
    document.getElementById(type).addEventListener('click', function(evt) {
        // variables globales de momento...
        var challenge_name=document.getElementById('challenge_name').value.toLowerCase().trim();
        challenge_name = challenge_name.replace(/[^a-z0-9]/gi,'');
        var username=document.getElementById('jugador').value.toLowerCase().trim();
        username= username.replace(/[^a-z0-9]/gi,'');
        if(username.length==0){
            alert("\""+username+"\" no es válido. Use sólo letras sin acento y números.");
        }else{
            session.user=username;
        }
        if(challenge_name.length==0){alert("\""+challenge_name+"\" no es válido o está vacío. Use sólo letras sin acento y números.");}
        else{
            session.challenge_name=challenge_name;
            firebase.database().ref().child('challenges/'+challenge_name).once('value', function(snapshot) {challenge_form_action(snapshot.val(),type);}.bind(this));
        }
    });
    document.getElementById("go-back").addEventListener(clickOrTouch,function(){menu_screen();});
}

function challenge_form_action(challenge,type){
    var updates = {};
    var c=random_carton();
    //var cm=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    var u={
            role: 'invitee',
            score: 0,
            lifes: 3,
            answer: '',
            carton:c//,
            //cm:cm
        };
    if(type=='crear'){
        u.role='inviter';
        if(challenge!=undefined && challenge!=null && challenge!='null' && challenge!=""){
            alert('el nombre de partida \"'+session.challenge_name+'\" ya existe, elige otro');
            session.challenge_name="";
            return;
        }
        var challange_instance={
            // modified by the game
            name: session.challenge_name,
            time_left: 60,
            timestamp: get_timestamp_str(),
            question: '',
            answer_options: ['',''],
            answer_msg: '',
            game_status:'waiting',
            // modified by each user, avoid concurrent mod overwritting
            u:{}
        };
        challange_instance.u[session.user]= u;
        var challenge_beat={
            u:{}
        };
        challenge_beat.u[session.user]={
            beat: session.beat
        };
        updates['challenges/'+session.challenge_name] = challange_instance;
        updates['challenges-beat/'+session.challenge_name] = challenge_beat;
    }else{
        if(challenge_name==undefined || challenge_name==null || challenge_name=='null' || challenge_name=="" || challenge.game_status!="waiting"){
            alert('La partida '+session.challenge_name+' no existe ¿seguro que se llama así?');
            session.challenge_name="";
            return;
        }
        if (challenge.u.hasOwnProperty(session.user)){
            alert('El jugador "'+session.user+'" ya existe. Elige otro nombre.');
            return;
        }
        var updates = {};
        updates['challenges/'+session.challenge_name+'/u/'+session.user]=u;
        updates['challenges-beat/'+session.challenge_name+'/u/'+session.user]={
            beat: session.beat
        };
    }
    // CORE POINT //////////////////////////////////////////////////////////////////////////777777777
    reset_local_game(); // needed? yes...
    firebase.database().ref().update(updates);
    console.log(type+' partida '+session.challenge_name);
    firebase.database().ref().child('challenges/'+session.challenge_name).on('value', function(snapshot) {listen_challenge(snapshot.val());}); // listen to changes
    session.beat_timeout=setTimeout(function(){handle_beat();}.bind(this),7000); // produce beat for this user
    /////////////////////////////////////////////////////////////////////////////////////////777777777
}









function handle_beat(){
    session.beat++;
    session.beat_timeout=setTimeout(function(){handle_beat();}.bind(this),7000); // set it again (or use interval...)
    var updates={};
    updates['challenges-beat/'+session.challenge_name+'/u/'+session.user+'/beat'] = session.beat;
    firebase.database().ref().update(updates);
    firebase.database().ref().child('challenges-beat/'+session.challenge_name).once('value', function(snapshot) {handle_zombies(snapshot.val());});
    // TODO: what if this does not exist??? we should clear the timeout...
}
function handle_zombies(challenge_beat) {
    var challenge_zombies_beat=challenge_beat.u;
    console.log("handle_zombies "+session.beat);
    if(session.last_zombies_beat==null || Object.keys(session.last_zombies_beat).length!=Object.keys(challenge_zombies_beat).length){ // initialize
        session.last_zombies_beat=challenge_zombies_beat;
        console.log("initialize zombies_beat");
    }else{ // compare local to global
        for (var user in challenge_zombies_beat){
            if(user!=session.user){
                console.log("is "+user+" a zombie "+challenge_zombies_beat[user].beat+" ("+session.last_zombies_beat[user]+")? to kill "+session.zombies_to_kill.join(", "));
                if(challenge_zombies_beat[user].beat==session.last_zombies_beat[user]){
                    if(session.zombies_to_kill.indexOf(user)==-1){
                        console.log("candidate");
                        session.zombies_to_kill.push(user);
                    }else{
                        console.log("yes, who should kill?\n\n");
                        // are there session_masters before me who could kill zombies?
                        var leader=get_session_master(challenge_beat);
                        if(user==leader){
                            for (var new_leader in challenge_zombies_beat){
                                if(session.zombies_to_kill.indexOf(new_leader)==-1){
                                    leader=new_leader;
                                    break;
                                }
                            }
                        }
                        if(leader==session.user){
                            // the session_master is automated. Kill zombies
                            console.log("I"+session.user+" will kill the zombie!! "+user);
                            //session.zombies_to_kill=[]; activate to only kill one at a time... could make sense
                            firebase.database().ref().child('challenges/'+session.challenge_name+'/u/'+user).remove();
                            firebase.database().ref().child('challenges-beat/'+session.challenge_name+'/u/'+user).remove();
                        }else{
                            console.log("leader will kill "+leader);
                        }
                    }
                }else{
                    console.log("not a zombie");
                    session.last_zombies_beat[user]=challenge_zombies_beat[user].beat;
                    if(session.zombies_to_kill.indexOf(user)!=-1){
                        console.log("lo quito de candidatos a zombie");
                        session.zombies_to_kill.splice(session.zombies_to_kill.indexOf(user), 1);
                    }
                }
            }
        }
    }
}














function listen_challenge(challenge){
    console.log('challenge:'+JSON.stringify(challenge));
    // store challenge globally for the timeout
    session.challenge=challenge;
    
    if(challenge==null || challenge==undefined){ // CANCELLED!! -----------------------------------------------
        cancel_challenge(challenge);
        if(canvas_zone_vcentered.innerHTML.indexOf('GAME OVER')==-1){
            canvas_zone_vcentered.innerHTML=' \
              GAME CANCELLED! <br />Hasta luego baby!<br /><br />\
              <button id="accept_over">accept</button>\
            <br />\
            ';
        }
        document.getElementById("accept_over").addEventListener(clickOrTouch,function(){
             menu_screen();
		});
        
    }else if(challenge.game_status=='over'){ // OVER!! -----------------------------------------------
        console.log('challenge over!');
        canvas_zone_vcentered.innerHTML=' \
          GAME OVER! <br /><br />Winner: '+get_winner_string(challenge)+'<br />\
          <button id="accept_over">accept</button>\
        <br />\
        ';
        cancel_challenge_prompt(challenge,false); // cancel without asking
    }else{
        if(Object.keys(challenge.u).length<2 && challenge.game_status!="waiting"){ 
            console.log("canceling game, only 1 player alive");
            cancel_challenge_prompt(challenge,false);
        }
        if(challenge.game_status=='waiting'){
            var accept_button='';
            //var updates = {};
            var session_master=get_session_master(challenge);
            if(session.user==session_master && Object.keys(challenge.u).length>1){
                accept_button='<button id="start_challenge">start</button>';
            }else{
                accept_button='<br /><br/>"'+session_master+'" decidirá cuando empezar (min: 2 jug)';
            }
            //firebase.database().ref().update(updates);
            //challenge:'+JSON.stringify(challenge)+'
            var somos="";
            for (var user in challenge.u){
                if(user==session.user) somos+=""+user+" (tú)<br />";
                else somos+=""+user+"<br />";
            }
            canvas_zone_vcentered.innerHTML=' \
              partida: '+session.challenge_name+'<br />...esperando... <br/>de momento somos '+challenge.u.length+':<br/>'+somos+'<br />\
              '+accept_button+'\
            <br /><button id="go-back" class="minibutton fixed-bottom-right go-back">&lt;</button> \
            ';
            console.log('session-master:'+get_session_master(challenge));
            if(
                //(
                //session.challenge.u[session.user].role=='inviter' || 
                session.user==get_session_master(challenge)
                //) 
                && Object.keys(challenge.u).length>1){
                document.getElementById("start_challenge").addEventListener(clickOrTouch,function(){
                    var updates = {};
                    updates['challenges/'+session.challenge_name+'/game_status'] = 'playing';
                    updates['challenges/'+session.challenge_name+'/bolas'] = [0,0,0];
                    firebase.database().ref().update(updates);
                    activity_timer.start(); // this will fire next events
                    });
            }
            document.getElementById("go-back").addEventListener(clickOrTouch,function(){cancel_challenge_prompt(challenge);}.bind(challenge));
        }
        else if(challenge.game_status=='playing'){
            //if(session.user==get_session_master(challenge)){
            //}
            var ult3bolas=session.challenge.bolas.slice(-3)
            canvas_zone_vcentered.innerHTML=' \
              - || - || <b style="font-size:2em">'+ult3bolas[2]+'</b> || '+ult3bolas[1]+' ||'+ult3bolas[0]+'\
              <br />\
              <table id="carton">\
                <tr>\
                    <td id="square0" class="filler">&nbsp;</td>\
                    <td id="square3" class="filler">&nbsp;</td>\
                    <td id="square6" class="filler">&nbsp;</td>\
                    <td id="square9" class="filler">&nbsp;</td>\
                    <td id="square12" class="filler">&nbsp;</td>\
                    <td id="square15" class="filler">&nbsp;</td>\
                    <td id="square18" class="filler">&nbsp;</td>\
                    <td id="square21" class="filler">&nbsp;</td>\
                    <td id="square24" class="filler">&nbsp;</td>\
                </tr>\
                <tr>\
                    <td id="square1" class="filler">&nbsp;</td>\
                    <td id="square4" class="filler">&nbsp;</td>\
                    <td id="square7" class="filler">&nbsp;</td>\
                    <td id="square10" class="filler">&nbsp;</td>\
                    <td id="square13" class="filler">&nbsp;</td>\
                    <td id="square16" class="filler">&nbsp;</td>\
                    <td id="square19" class="filler">&nbsp;</td>\
                    <td id="square22" class="filler">&nbsp;</td>\
                    <td id="square25" class="filler">&nbsp;</td>\
                </tr>\
                <tr>\
                    <td id="square2" class="filler">&nbsp;</td>\
                    <td id="square5" class="filler">&nbsp;</td>\
                    <td id="square8" class="filler">&nbsp;</td>\
                    <td id="square11" class="filler">&nbsp;</td>\
                    <td id="square14" class="filler">&nbsp;</td>\
                    <td id="square17" class="filler">&nbsp;</td>\
                    <td id="square20" class="filler">&nbsp;</td>\
                    <td id="square23" class="filler">&nbsp;</td>\
                    <td id="square26" class="filler">&nbsp;</td>\
                </tr>\
            </table>\
             <!--<button id="linea" class="minibutton">Linea</button>-->    <button id="bingo" class="minibutton">BINGO</button> <br />\
            <br /><button id="go-back" class="minibutton fixed-bottom-right go-back">&lt;</button> \
            ';
            print_card(session.challenge.u[session.user].carton);
            //document.getElementById("linea").addEventListener(clickOrTouch,function(){cancel_challenge_prompt(challenge);}.bind(challenge));
            document.getElementById("bingo").addEventListener(clickOrTouch,function(){check_bingo();});
            document.getElementById("go-back").addEventListener(clickOrTouch,function(){cancel_challenge_prompt(challenge);}.bind(challenge));
        }else if(challenge.game_status=='waiting_check'){
        }
    }
}





var reset_local_game=function(){
	//session.num_correct=0; (should be from the game...)
    session.lifes=3; // should probably be from the game too
	var timestamp=new Date();
	session.timestamp=timestamp.getFullYear()+"-"+
		pad_string((timestamp.getMonth()+1),2,"0") + "-" + pad_string(timestamp.getDate(),2,"0") + " " +
		 pad_string(timestamp.getHours(),2,"0") + ":"  + pad_string(timestamp.getMinutes(),2,"0");
    session.last_zombies_beat={};
    session.zombies_to_kill=[];
    activity_timer.reset();

    
}

var get_session_master=function(challenge){
    return Object.keys(challenge.u).sort()[0];
}


function cancel_challenge_prompt(challenge,ask){
    if(typeof(ask)=='undefined') ask=true;
    var r = true;
    if(ask) r=confirm("¿Seguro que quieres salir, el juego parará para todos los jugadores?");
    if (r == true) {
        var updates = {};
        console.log('canceling '+JSON.stringify(challenge));
        updates['challenges/'+session.challenge_name] = null;
        updates['challenges-beat/'+session.challenge_name] = null;
        firebase.database().ref().update(updates);
    }
}

function cancel_challenge(challenge){
    reset_local_game();
    //clearTimeout(show_answer_timeout);
    clearTimeout(session.beat_timeout);
    firebase.database().ref().child('challenges/'+session.challenge_name).off();
    firebase.database().ref().child('challenges-beat/'+session.challenge_name).off();
    console.log('challenge canceled!');

}



/////////////////// GAME SPECIFIC /////////////////// COULD BE AN EXCHANGABLE OBJECT... FOR DIFFERENT GAMES
var countdown_limit_end_secs=7;
activity_timer.set_limit_end_seconds(countdown_limit_end_secs); 
var timeout_callback=function(){
	activity_timer.reset();
	if(debug) console.log("playing_timeout!!!");
	new_number();
}
activity_timer.set_end_callback(timeout_callback);



var card=[];
/**
* Devuelve numeros aleatorios de un intervalo
* @param {integer} inicio numero de incio
* @param {integer} fin fin del intervalo
* @param {integer} numero cantidad de numeros aleatorios a generar
* @returns {integer} array de numeros aleatorios
*/
function aleatorio(inicio, fin, numero)
{
	var numeros = [];
	var i = 0;
	if(!numero || numero<=0)
	{
		return Math.floor(Math.random()*(fin-inicio+1)) + inicio;
	}
	else
	{
		while(numeros.length < numero)
		{
			var aleatorios = Math.floor(Math.random()*(fin-inicio+1)) + inicio;
			if(numeros.indexOf(aleatorios) == -1)
			{
				numeros.push(aleatorios);
			}
		}
		return numeros.sort(function(a,b){return a-b;}); //Ordeno los numeros aleatorios que me han dado como resultados
	}
}

function random_carton() {
    card=[];
    var cols1=[1,2,3];
    do{
        cols1=aleatorio(0,8,3);
    }while(triad(cols1));
    console.log("cols1="+cols1);
    for(var i=0 ; i<9 ; i++){
        var col=aleatorio(i+(9*i),i+(9*(i+1)),3);
        if(i==0){col=aleatorio(1,i+(9*(i+1)),3);}
        if(i==8){col=aleatorio(80,90,3);}
        var blank_rows=1;
        if(cols1.indexOf(i)!=-1) blank_rows=2;
        var which_blank=aleatorio(0,2,blank_rows);
        
        // TODO: falta el caso      9  9
        //                          x  x  si la siguente es de solo un blank antes no se tendría q haber podido poner en la misma linea
        //                          9  9
        if(i==2){
            // si las 2 de antes de la misma fila eran blank ya no se puede
            var count=0;
            do{
                if(count>0){
                    console.log("bad "+which_blank.join(","));
                }
                which_blank=aleatorio(0,2,blank_rows);
                console.log("trying "+which_blank.join(","));
                count++;
                if(count==30){ console.log("had to break");break;}
            }while(
                   (which_blank.indexOf(0)!=-1 && prev2blank(i*3,card)) ||
                   (which_blank.indexOf(1)!=-1 && prev2blank((i*3)+1,card)) ||
                   (which_blank.indexOf(2)!=-1 && prev2blank((i*3)+2,card)) ||
                   (which_blank.indexOf(0)==-1 && prev2notblank(i*3,card)) ||
                   (which_blank.indexOf(1)==-1 && prev2notblank((i*3)+1,card)) ||
                   (which_blank.indexOf(2)==-1 && prev2notblank((i*3)+2,card)) 
                   );
        }
        if(i>=3){
            // lo mismo y además si en la fila ya hay 4 blank ya no se puede
            var count=0;
            do{
                if(count>0){
                    console.log("bad "+which_blank.join(","));
                }
                which_blank=aleatorio(0,2,blank_rows);
                console.log("trying "+which_blank.join(","));
                count++;
                if(count==30){ console.log("had to break");break;}
            }while(
                   (which_blank.indexOf(0)!=-1 && prev2blank(i*3,card)) ||
                   (which_blank.indexOf(1)!=-1 && prev2blank((i*3)+1,card)) ||
                   (which_blank.indexOf(2)!=-1 && prev2blank((i*3)+2,card)) ||
                   (which_blank.indexOf(0)==-1 && prev2notblank(i*3,card)) ||
                   (which_blank.indexOf(1)==-1 && prev2notblank((i*3)+1,card)) ||
                   (which_blank.indexOf(2)==-1 && prev2notblank((i*3)+2,card)) ||
                   (which_blank.indexOf(0)!=-1 && row_blanks(0,card)>=4) ||
                   (which_blank.indexOf(1)!=-1 && row_blanks(1,card)>=4) ||
                   (which_blank.indexOf(2)!=-1 && row_blanks(2,card)>=4)
                   );
        }
        for(const blank_pos of which_blank){
            col[blank_pos]=-1;
        }
        //console.log(col);
        card=card.concat(col);
        console.log(card);
    }
//  clean(card);
    return card;
}

function prev2blank(pos,card){
    if(card.length<6 || pos <6) return false;
    if(card[pos-3]==-1 && card[pos-6]==-1){
        console.log("2 blanks pos="+pos);
        return true;
    }
    return false;
}
function prev2notblank(pos,card){
    if(card.length<6 || pos <6) return false;
    if(card[pos-3]!=-1 && card[pos-6]!=-1){
        console.log("2 NOT blanks pos="+pos);
        return true;
    }
    return false;
}


function row_blanks(row,card){
    var blanks=0;
    for(var i=0;i<card.length;i++){
        if((i%3)==row && card[i]==-1){
            blanks++;
        }
    }
    console.log("blanks row"+row+"="+blanks);
    return blanks;
}


function triad(c){
    console.log(c.length);
    for (var i=0;i<c.length-2;i++){
        if(c[i]+1==c[i+1] && c[i+1]+1==c[i+2]) return true; 
    }
    return false;
}

function print_card(card){
  for(var i=0 ; i<27 ; i++){
      if(card[i]!=-1){
          document.getElementById("square" + i).innerHTML = card[i];
          if(session.game.cm[i]==1 && !document.getElementById("square" + i).classList.contains('marked')) document.getElementById("square" + i).classList.add("marked");
          document.getElementById("square" + i).addEventListener(clickOrTouch,function(){mark(this.id)});
      }
      else document.getElementById("square" + i).innerHTML = '&#9825';
  }
}

function mark(num){
    num=num.substring(6,num.length);
    if(session.game.cm[num]==1){console.log("desmarcar"+num+" val:"+session.game.cm.join(", "));session.game.cm[num]=0;}
    else{session.game.cm[num]=1;document.getElementById("square" + num).classList.add("marked");}
    //var updates = {};
    //updates['challenges/'+session.challenge_name+'/u/'+session.user+'/mc'] = session.challenge.u[session.user].cm;
    //firebase.database().ref().update(updates);
}


function new_number(){
    // use session challenge
    var bola=0;
    do{
        bola=Math.floor((Math.random()*89))+1;
    }while(session.challenge.bolas.indexOf(bola)!=-1);
    session.challenge.bolas.push(bola);
    var updates = {};
    updates['challenges/'+session.challenge_name+'/bolas'] = session.challenge.bolas;
    firebase.database().ref().update(updates);
    activity_timer.start(); // this will fire next events
}

function is_bingo(user){
    if(typeof(user)=='undefined') user=session.user;
    for(var num of session.challenge.u[user].carton){ // better to just do a normal "for"
        var pos=session.challenge.u[user].carton.indexOf(num); // and then this is not needed
        if(session.challenge.bolas.indexOf(num)==-1){
            if(user==session.user){
                session.game.cm[pos]=0;
                session.game.tmpError=num;
            }
            return false;
        }
    }
    return true;
}

function check_bingo(user){
    if(!is_bingo(user)){
        alert("el bingo no es correcto. La bola "+session.game.tmpError+" no ha salido.");
        session.game.tmpError="";
        return;
    }else{
        //move to game over
        var updates = {};
        updates['challenges/'+session.challenge_name+'/game_status'] = 'over';
        firebase.database().ref().update(updates);
    }
}


function get_winner_string(){
    var winner=[];
    for(var u in session.challenge.u){
        if(is_bingo(u)){
            winner.push(u);
        }
    }
    return "Ganador ("+winner.length+"): "+winner.join(", ");
}



var QueryString=get_query_string();
var debug=false;
var user_bypass=undefined;
if(QueryString.hasOwnProperty('debug') && QueryString.debug=='true') debug=true;

// responsive tunings
prevent_scrolling();

var is_app=is_cordova();
if(is_app){
    if (!window.cordova) alert("ERROR: Running cordova without including cordova.js!");
	document.addEventListener('deviceready', onDeviceReady, false);
}else{
    onDeviceReady();
}

function onDeviceReady() {
    console.log('userAgent: '+navigator.userAgent+' is_app: '+is_app);
	menu_screen(); // <----- entry point
}

// window.onload = function () does not work for apps
window.onload = function () { 
	if(debug) console.log("win.onload");
	//var splash=document.getElementById("splash_screen");
	//if(splash!=null && (ResourceLoader.lazy_audio==false || ResourceLoader.not_loaded['sounds'].length==0)){ splash.parentNode.removeChild(splash); }
}











