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
	encodeFully: function(s) {return encodeURIComponent(s).replace(/\./g, '%2E');},
	decode: function(s) {return decodeURIComponent(s);}
};


var noSleep = null;
if( /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    noSleep=new NoSleep();
}

var zombie_strategy="just_take_lidership"; // or "kill" to completely kick-them-out of challenge
//var zombie_started=false; // meter en session, only if we want to start at "playing" state... but for the waitroom is also important...
var activity_timer=new ActivityTimer();
var session={};
var reset_local_game=function(){
    let user="";
    // keep user name if it is set
    if (session.hasOwnProperty('user')) user=session.user;

    session={
        challenge_name:"",
        user: user,
        timestamp: new Date(), //.valueOf()
        level: "normal",
        used_messages: [],
        beat: 0,
        beat_utc: 0,
        beat_timeout: null,
        beat_timeout_duration: 9000,
        last_challenge_beat_snapshot:{},
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
    
    /*var timestamp=new Date();
    session.timestamp=timestamp.getFullYear()+"-"+
        pad_string((timestamp.getMonth()+1),2,"0") + "-" + pad_string(timestamp.getDate(),2,"0") + " " +
         pad_string(timestamp.getHours(),2,"0") + ":"  + pad_string(timestamp.getMinutes(),2,"0");*/
    activity_timer.reset();
}

reset_local_game();

var canvas_zone_vcentered=document.getElementById('zone_canvas_vcentered');



function menu_screen(){
    if( /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        noSleep.disable();
    }
	allowBackExit();
    console.log('menu_screen user: ('+session.user+')');
	let splash=document.getElementById("splash_screen");
	if(splash!=null){ splash.parentNode.removeChild(splash); }

	let wakelock="";
    if(mobile_without_wakelock) wakelock=":-( mob_wo_wakelock="+mobile_without_wakelock;
    canvas_zone_vcentered.innerHTML=' \
    <div id="menu-logo-div"></div> \
    <nav id="responsive_menu">\
    <span style="font-size:9vw;color:#0b5394;font-weight:bold;">BINGO</span><br /><span style="font-family:cursive;font-size:4vw;">¡para TODOS!</span><br />\
    <br /><button id="create-button" class="coolbutton">Crear partida</button> \
    <br /><button id="join-button" class="coolbutton">Unirse a partida</button>\
    </nav>\
    <br /><br /><span id="spaninfo" style="font-size:0.7vw">'+wakelock+' is_app='+is_app+'</span> \
    ';
    if(is_app){
        admob.showBannerAd(false, function(){document.getElementById('spaninfo').innerHTML+="<br /><br /><span style=\"font-size:0.7vw;\">BANNER OK</span>";}, function(){document.getElementById('spaninfo').innerHTML+="<br /><br /><span style=\"font-size:0.7vw;\">BANNER FAIL</span>";});
    }
    document.getElementById("create-button").addEventListener(clickOrTouch,function(){challenge_form('crear');});
    document.getElementById("join-button").addEventListener(clickOrTouch,function(){challenge_form('unirse');});
    
}


function challenge_form(type){
    reset_local_game();
    canvas_zone_vcentered.innerHTML=' \
          <span style="font-variant: small-caps;font-size:4vw;">Partida:</span> <input class="coolinput" id="challenge_name" pattern="[a-zA-Z0-9]+"  maxlength="15"/><br />\
          <span style="font-variant: small-caps;font-size:4vw;">Jugador:</span> <input class="coolinput" id="jugador" value="'+session.user+'"  maxlength="10"/><br />\
        <button class="coolbutton" id="'+type+'">'+type+'</button>\
        <br /><button id="go-back" class="minibutton fixed-bottom-right go-back">&lt;</button> \
        ';
    document.getElementById("challenge_name").focus();
    document.getElementById("challenge_name").addEventListener("keyup", function(event) {
        if(!( /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) && event.keyCode && event.keyCode === 13) {
            event.preventDefault();
            document.getElementById("jugador").focus();
        }
    });
    document.getElementById("jugador").addEventListener("keyup", function(event) {
        if (!( /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) && event.keyCode && event.keyCode === 13) {
            event.preventDefault();
            document.getElementById(type).click();
        }
    });
    document.getElementById(type).addEventListener('click', function(evt) {
        // variables globales de momento...
        var challenge_name=document.getElementById('challenge_name').value.toLowerCase().trim();
        //challenge_name = challenge_name.replace(/[^a-z0-9]/gi,'');
        var username=document.getElementById('jugador').value.toLowerCase().trim();
        username= username.substr(0,11).trim().replace(/\s+/gi,'_');
        username=username.charAt(0).toUpperCase() + username.slice(1);
        if(username.length==0){
            alert("\""+username+"\" no puede estar vacío");
        }else{
            session.user=username;
        }
        if(challenge_name.length==0 || challenge_name.match(/[^a-z0-9]/)!=null){alert("Nombre partida=\""+challenge_name+"\" no es válido o está vacío. Use sólo letras sin acento y números (sin espacios).");}
        else{
            session.challenge_name=challenge_name;
            firebase.database().ref().child('challenges/'+challenge_name).once('value', function(snapshot) {challenge_form_action(snapshot.val(),type);}.bind(this));
        }
    });
    document.getElementById("go-back").addEventListener(clickOrTouch,function(){menu_screen();});
}

function challenge_form_action(challenge,type){
    var updates = {};
    var c=[];
    do{
        c=random_carton();
    }while(!check_carton(c));
    var u={
            role: 'invitee',
            beat: 'active',
            score: 0,
            lifes: 3,
            answer: '',
            carton:c
        };
    if(type=='crear'){
        u.role='inviter';
        if(challenge!=undefined && challenge!=null && challenge!='null' && challenge!=""){
            alert('el nombre de partida \"'+session.challenge_name+'\" ya existe, elige otro');
            session.challenge_name="";
            return;
        }else{
            var challange_instance={
                // modified by the game
                name: session.challenge_name,
                time_left: 60,
                timestamp: get_timestamp_str(),
                question: '',
                linea: '',
                cantadores: [''],
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
            //challenge_beat.u[session.user]={ // net to check if firebase will take in key and value...
            //    beat: session.beat
            //};
            updates['challenges/'+session.challenge_name] = challange_instance;
            updates['challenges-beat/'+session.challenge_name] = challenge_beat;
        }
    }else{
        if(challenge==null || challenge==undefined || challenge=='null' || challenge==""){
            alert('La partida '+session.challenge_name+' no existe ¿seguro que se llama así?');
            session.challenge_name="";
            return;
        }else if(challenge.game_status!="waiting"){
            alert('La partida '+session.challenge_name+' ya ha empezado. Has llegado tarde.');
            session.challenge_name="";
            return;
        }else if (challenge.u.hasOwnProperty(session.user)){
            alert('El jugador "'+session.user+'" ya existe. Elige otro nombre.');
            return;
        }else if (Object.keys(challenge.u).length>29){
            alert('No caben más jugadores (max 30).');
            return;
        }else{
            var updates = {};
            updates['challenges/'+session.challenge_name+'/u/'+session.user]=u;
            /*updates['challenges-beat/'+session.challenge_name+'/u/'+session.user]={
                beat: session.beat
            };*/
        }
    }
    // CORE POINT //////////////////////////////////////////////////////////////////////////777777777
    //zombie_started=false; // only if we want to move this to "playing"
    if( /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        noSleep.enable();
    }
    session.beat_timeout=setTimeout(function(){handle_beat();}.bind(this),session.beat_timeout_duration); // produce beat for this user
    firebase.database().ref().update(updates);
    console.log(type+' partida '+session.challenge_name);
    firebase.database().ref().child('challenges/'+session.challenge_name).on('value', function(snapshot) {listen_challenge(snapshot.val());}); // listen to changes
    /////////////////////////////////////////////////////////////////////////////////////////777777777
}









function handle_beat(){
    session.beat++;
    session.beat_utc=new Date();
    session.beat_timeout=setTimeout(function(){handle_beat();}.bind(this),session.beat_timeout_duration); // set it again (or use interval...)
    var updates={};
    updates['challenges-beat/'+session.challenge_name+'/u/'+session.user+'/beat'] = session.beat;
    updates['challenges-beat/'+session.challenge_name+'/u/'+session.user+'/beat_utc'] = session.beat_utc;
    if(session.challenge && session.challenge.u && 
       session.challenge.u[session.user].beat!='active'){
        updates['challenges/'+session.challenge_name+'/u/'+session.user+'/beat'] = 'active';
    }
    firebase.database().ref().update(updates);
    firebase.database().ref().child('challenges-beat/'+session.challenge_name).once('value', function(snapshot) {handle_zombies(snapshot.val());});
    // TODO: what if this does not exist??? we should clear the timeout...
}
function handle_zombies(challenge_beat) {
    if(challenge_beat==null || challenge_beat==undefined){ // POTENTIALLY CANCELLED CHALLENGE
        //cancel_challenge(session.challenge);
        alert("challenge_beat is null, reset_local_game"); // this should never fire since the timeout should be cleared on cancelling
        if( /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
            noSleep.disable();
        }
        reset_local_game();
    }else{
        //console.log("handle_zombies "+session.beat);
        if(session.last_challenge_beat_snapshot==null || Object.keys(session.last_challenge_beat_snapshot).length!=Object.keys(challenge_beat.u).length){ // initialize
            session.last_challenge_beat_snapshot=challenge_beat.u;
            console.log("initialize zombies_beat");
        }else{ // compare local to global
            for (var user in challenge_beat.u){ // TODO: we need to keep a list of active users
                //console.log("checking zombie: "+user);
                if(user!=session.user){
                    if(challenge_beat.u[user].beat==session.last_challenge_beat_snapshot[user].beat && session.challenge.u[user].beat!='inactive'){
                        console.log("is "+user+" a zombie "+challenge_beat.u[user].beat+" ("+session.last_challenge_beat_snapshot[user].beat+")? to kill ("+session.zombies_to_kill.join(", ")+")");
                        if(session.zombies_to_kill.indexOf(user)==-1){
                            console.log(user+" zombie candidate");
                            session.zombies_to_kill.push(user);
                        }else{
                            //console.log(user+" is a zombie, who should kill?");
                            // are there session_masters before me who could kill zombies?
                            var leader=get_session_master(challenge_beat);
                            if(user==leader || session.challenge.u[user].beat=='inactive'){
                                console.log("find new leader");
                                for (var new_leader in challenge_beat.u){
                                    if(session.zombies_to_kill.indexOf(new_leader)==-1 && session.challenge.u[user].beat!='inactive'){
                                        leader=new_leader;
                                        console.log("new leader="+new_leader);
                                        break;
                                    }
                                }
                            }
                            if(leader==session.user){
                                console.log("I ("+session.user+") will kill the zombie: "+user);
                                if(zombie_strategy=="kill"){
                                    // the session_master is automated. Kill zombies
                                    //session.zombies_to_kill=[]; activate to only kill one at a time... could make sense
                                    firebase.database().ref().child('challenges/'+session.challenge_name+'/u/'+user).remove();
                                    firebase.database().ref().child('challenges-beat/'+session.challenge_name+'/u/'+user).remove();
                                    if(session.challenge!=null && session.challenge.game_status=='playing'){
                                        activity_timer.start(); // this will fire next events...
                                        let updates={};
                                        updates['challenges/'+session.challenge_name+'/question'] = '<b>'+user+'</b> se ha desconectado,<br />el resto,';
                                        firebase.database().ref().update(updates);
                                    }
                                }else{ // just take lidership
                                    let updates={};
                                    if(session.challenge.u[user].role=="inviter"){ // if we kill the inviter we take the role
                                        updates['challenges/'+session.challenge_name+'/u/'+user+'/role']='invitee';
                                        updates['challenges/'+session.challenge_name+'/u/'+leader+'/role']='inviter';
                                    }
                                    if(session.challenge!=null && session.challenge.game_status=='playing'){
                                        activity_timer.start(); // this will fire next events..., by the time this fires, the role will be inviter
                                        updates['challenges/'+session.challenge_name+'/question'] = '<b>'+user+'</b> se ha desconectado,<br />el resto,';
                                    }
                                    if(session.zombies_to_kill.indexOf(user)!=-1){
                                        session.zombies_to_kill.splice(session.zombies_to_kill.indexOf(user), 1);
                                    }
                                    updates['challenges/'+session.challenge_name+'/u/'+user+'/beat'] = 'inactive'; // TODO: better keep this in main challenge
                                    firebase.database().ref().update(updates);
                                }
                            }else{
                                console.log(leader+" leader will kill zombie: "+user);
                            }
                        }
                    }else{
                        //console.log("already inactive or active beating (not a zombie): "+user);
                        session.last_challenge_beat_snapshot[user]=challenge_beat.u[user];
                        if(session.zombies_to_kill.indexOf(user)!=-1){
                            console.log("quito '"+user+"' de candidatos a zombie");
                            session.zombies_to_kill.splice(session.zombies_to_kill.indexOf(user), 1);
                        }
                    }
                }else{
                    session.last_challenge_beat_snapshot[user]=challenge_beat.u[user];
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
        let canceltext=' \
              GAME CANCELLED! <br />Sayonara baby!<br /><br />\
              <button class="coolbutton" id="back_start">inicio</button>\
            <br />\
            ';
        if(canvas_zone_vcentered.innerHTML.indexOf('GAME OVER')==-1){
            canvas_zone_vcentered.innerHTML=canceltext;
        }else if(canvas_zone_vcentered.innerHTML.indexOf('GAME CANCELLED')==-1){
            canvas_zone_vcentered.innerHTML='Sayonara baby!<br /><button class="coolbutton" id="back_start">inicio</button>'+canvas_zone_vcentered.innerHTML;
            let elem=document.getElementById("accept_over")
            if(elem) elem.parentNode.removeChild(elem);
        }
        cancel_challenge();
        document.getElementById("back_start").addEventListener(clickOrTouch,function(){
             menu_screen();
        });
    }else if(challenge.game_status=='over'){ // OVER!! -----------------------------------------------
        activity_timer.stop();
        console.log('challenge over!');
        canvas_zone_vcentered.innerHTML=' \
          <b>GAME OVER!</b><br />Bingo cantado por: '+challenge.cantadores.join(', ')+'<br />'+get_winner_string(challenge)+'<br />\
          <button class="coolbutton" id="accept_over">Aceptar</button>\
        <br />\
        <br /><span id="spaninfo" style="font-size:0.7vw">is_app='+is_app+'</span> \
        ';
        if(is_app){ //admob
            admob.showBannerAd(true, function(){document.getElementById('spaninfo').innerHTML+="<br /><br /><span style=\"font-size:0.7vw;\">BANNER OK</span>";}, function(){document.getElementById('spaninfo').innerHTML+="<br /><br /><span style=\"font-size:0.7vw;\">BANNER FAIL</span>";});
        }else if(!is_local()){ // adsense in theory ... I could add the scripts here too
             canvas_zone_vcentered.innerHTML+='<ins class="adsbygoogle" style="display:block" data-ad-format="fluid"\
             data-ad-layout-key="-fb+5w+4e-db+86"\
             data-ad-client="ca-pub-1143362957092180"\
             data-ad-slot="3596710175"></ins>';
             (adsbygoogle = window.adsbygoogle || []).push({});
        }
        document.getElementById("accept_over").addEventListener(clickOrTouch,function(){
             // remove over for the one that clicks accept so that the cancel screen is updated
             cancel_challenge_prompt(challenge,false); // cancel without asking
        });
    }else{
        if(challenge.game_status=='waiting'){
            let accept_button='';
            //var updates = {};
            var inviter=get_inviter();
            if(session.user==inviter && Object.keys(challenge.u).filter(obj => challenge.u[obj].beat=='active').length>1){
                accept_button='<button class="coolbutton" id="start_challenge">empezar</button>';
            }else{
                accept_button='<br /><br/>"'+inviter+'" decidirá cuando empezar (min: 2 jug)';
            }
            //firebase.database().ref().update(updates);
            //challenge:'+JSON.stringify(challenge)+'
            canvas_zone_vcentered.innerHTML=' \
              PARTIDA: <b>'+session.challenge_name+'</b><br/>de momento somos <b>'+Object.keys(challenge.u).length+'</b><br/><br/>\
              <table id="players">\
            <tr><td id="p1" class="filler" style="width:50%">&nbsp;</td><td id="p2" class="filler" style="width:50%">&nbsp;</td></tr>\
            <tr><td id="p3" class="filler">&nbsp;</td><td id="p4" class="filler">&nbsp;</td></tr>\
            <tr><td id="p5" class="filler">&nbsp;</td><td id="p6" class="filler">&nbsp;</td></tr>\
            <tr><td id="p7" class="filler">&nbsp;</td><td id="p8" class="filler">&nbsp;</td></tr>\
            <tr><td id="p9" class="filler">&nbsp;</td><td id="p10" class="filler">&nbsp;</td></tr>\
            </table>\
              '+accept_button+'\
            <br /><button id="go-back" class="minibutton fixed-bottom-right go-back">&lt;</button> \
            ';
            for(var i=1 ; i<=Object.keys(challenge.u).length ; i++){
                let pnum=document.getElementById("p"+i);
                let ubeat="";
                let user=Object.keys(challenge.u)[i-1];
                if(i>10){
                    document.getElementById("p10").innerHTML="y más...";
                    break;
                }
                if(challenge.u[user].beat!='active') ubeat='[inactivo]'
                if(user==session.user) pnum.innerHTML=user+" (tú) "+ubeat;
                else pnum.innerHTML=""+user+" "+ubeat+"";
            }

            console.log('inviter:'+inviter);
            if(
                //(
                //session.challenge.u[session.user].role=='inviter' || 
                session.user==inviter
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
            /*if(!zombie_started){
                zombie_started=true;
                session.beat_timeout=setTimeout(function(){handle_beat();}.bind(this),12000); // produce beat for this user
            }*/
            if(Object.keys(challenge.u).length<2){ 
                console.log("canceling game, only 1 player alive");
                cancel_challenge_prompt(challenge,false);
            }
            
            if(challenge.question!=''){
                canvas_zone_vcentered.innerHTML=' \
                  '+challenge.question+'\
                    <br />\
                 ...continuamos en 5 segundos...\
                <br />\
                ';
            }else{
                var ult3bolas=session.challenge.bolas.slice(-3)
                let linea_str='<button class="coolbutton" id="linea">Linea</button>';
                if(challenge.linea!=''){
                    linea_str='';
                }
                let special_str='';
                if(session.game.cm.reduce(function(a, b){return a + b;}, 0)>11 &&
                         session.used_messages.indexOf('me quedan pocas')==-1){
                    special_str='<button class="coolbutton" id="special_str">me quedan pocas</button>';
                }else if(session.game.cm.reduce(function(a, b){return a + b;}, 0)<6 &&
                         (session.challenge.bolas.length-3)>20 &&
                         session.used_messages.indexOf('no marco')==-1){
                    special_str='<button class="coolbutton" id="special_str">no marco</button>';
                }else if(session.game.cm.reduce(function(a, b){return a + b;}, 0)<10 &&
                         (session.challenge.bolas.length-3)>60 &&
                         session.used_messages.indexOf('no marco')==-1){
                    special_str='<button class="coolbutton" id="special_str">no marco</button>';
                }
                // TODO continuar por aquí...
                
                canvas_zone_vcentered.innerHTML=' \
                  <table id="bolas"><tr>\
                    <td style="font-size:2vw">bola<br />'+(session.challenge.bolas.length-3)+'</td>\
                    <td><b style="font-size:5vw">'+ult3bolas[2]+'</b></td>\
                    <td>'+ult3bolas[1]+'</td>\
                    <td>'+ult3bolas[0]+'</td>\
                  </tr></table>\
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
                 '+special_str+'\
                 '+linea_str+'\
                 <button id="bingo"  class="coolbutton">BINGO</button> <br />\
                <br /><button id="go-back" class="minibutton fixed-bottom-right go-back">&lt;</button><br />\
                ';
                print_card(session.challenge.u[session.user].carton);
                if(special_str!=''){document.getElementById("special_str").addEventListener(clickOrTouch,function(){
                    let updates={};
                    special_str=special_str.replace(/<[^>]*>?/gm, '');
                    session.used_messages.push(special_str);
                    switch(special_str) {
                      case "me quedan pocas":
                        special_str = "Me quedan pocas, voy a ganar ;-)";
                        break;
                      case "no marco":
                        special_str = "¡No marco ni a la de tres! :-(";
                        break;
                      default:
                        special_str = "No se que iba a decir...";
                    }
                    updates['challenges/'+session.challenge_name+'/question'] = '<b>'+session.user+'</b> dice: '+special_str;
                    firebase.database().ref().update(updates);
                });}
                if(linea_str!=''){document.getElementById("linea").addEventListener(clickOrTouch,function(){check_linea();});}
                document.getElementById("bingo").addEventListener(clickOrTouch,function(){check_bingo();});
                document.getElementById("go-back").addEventListener(clickOrTouch,function(){cancel_challenge_prompt(challenge);}.bind(challenge));
            }
        }
    }
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

function cancel_challenge(){
    //clearTimeout(show_answer_timeout);
    clearTimeout(session.beat_timeout);
    firebase.database().ref().child('challenges/'+session.challenge_name).off();
    firebase.database().ref().child('challenges-beat/'+session.challenge_name).off();
    // re-do... just in case
    firebase.database().ref().child('challenges/'+session.challenge_name).remove();
    firebase.database().ref().child('challenges-beat/'+session.challenge_name).remove();
    // ----
    reset_local_game();
    console.log('challenge canceled!');

}



/////////////////// GAME SPECIFIC /////////////////// COULD BE AN EXCHANGABLE OBJECT... FOR DIFFERENT GAMES
var countdown_limit_end_secs=7;
activity_timer.set_limit_end_seconds(countdown_limit_end_secs); 
var timeout_callback=function(){
    // we should probably kill require inviter role here so we ensure only 1 owns activity_timer
	activity_timer.reset();
	console.log("activity_timer timeout_callback");
    if(session.challenge!=null && session.challenge.question!=''){
        setTimeout(function(){clear_msg();}.bind(this),7000);
    }else{
        new_number();
    }
}
activity_timer.set_end_callback(timeout_callback);


function clear_msg(){
    if(session.challenge.question!=''){  // esto podría hacerlo el lider
        let updates = {};
        console.log('cancelling msg ');
        updates['challenges/'+session.challenge_name+'/question'] = '';
        firebase.database().ref().update(updates);
        activity_timer.start(); // this will fire next events
    }
}

// si el lider muere... el nuevo lider tiene q ejecutar activity timer


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
        //console.log(card);
    }
//  clean(card);
    return card;
}

function check_carton(c){
    //should check if all rows have 5
    var row1=[];
    var row2=[];
    var row3=[]
    for(var i=0;i<c.length;i++){
        if(i%3==0 && c[i]!=-1) row1.push(1);
        if(i%3==1 && c[i]!=-1) row2.push(1);
        if(i%3==2 && c[i]!=-1) row3.push(1);
    }
    if(row1.length!=5 || row2.length!=5 || row3.length!=5){
        console.log("cartón incorrecto. regenerar...");
        return false;
    }
    else return true;
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
    if(session.game.cm[num]==1){
        document.getElementById("square" + num).classList.remove("marked");
        session.game.cm[num]=0;
    }
    else{session.game.cm[num]=1;document.getElementById("square" + num).classList.add("marked");}
    //var updates = {};
    //updates['challenges/'+session.challenge_name+'/u/'+session.user+'/mc'] = session.challenge.u[session.user].cm;
    //firebase.database().ref().update(updates);
}


function new_number(){
    // use session challenge
    if(session.challenge.u[session.user].role=="inviter"){
        if(session.challenge.bolas.length<93){ // 3 zeros added to start...
            var bola=0;
            var todas=new Array(90);
            for(var i = 0; i < todas.length; i++){
              todas[i]=i+1;
            }
            var diff = todas.filter(x => !session.challenge.bolas.includes(x));
            bola=diff[Math.floor(Math.random()*diff.length)];
            //do{
            //}while(session.challenge.bolas.indexOf(bola)!=-1);
            session.challenge.bolas.push(bola);
            var updates = {};
            updates['challenges/'+session.challenge_name+'/bolas'] = session.challenge.bolas;
            firebase.database().ref().update(updates);
            activity_timer.start(); // this will fire next events
        }else{
            activity_timer.stop();
            var question='Ya han salido todas las bolas... ay ay ay alguien se ha dormido!<br />';
            var updates = {};
            session.challenge.cantadores.push('..nadie..');
            if(session.challenge.cantadores[0]==""){
                session.challenge.cantadores.shift();
            }
            updates['challenges/'+session.challenge_name+'/game_status'] = 'over';
            updates['challenges/'+session.challenge_name+'/cantadores'] = session.challenge.cantadores;
            let timestamp=session.timestamp;
            timestamp=timestamp.getFullYear()+"-"+
            pad_string((timestamp.getMonth()+1),2,"0") + "-" + pad_string(timestamp.getDate(),2,"0") + "_" +
              pad_string(timestamp.getHours(),2,"0") + ""  + pad_string(timestamp.getMinutes(),2,"0");
            updates['challenges-log/'+timestamp+'_'+session.challenge_name+'/'] = session.challenge;
            firebase.database().ref().update(updates);
        }
    }
}


function auto_mark(){
    var user=session.user;
    for(var num of session.challenge.u[user].carton){ // better to just do a normal "for"
        var pos=session.challenge.u[user].carton.indexOf(num); // and then this is not needed
        if(num!=-1){
            if(session.challenge.bolas.indexOf(num)==-1){
                session.game.cm[pos]=0;
                document.getElementById("square" + pos).classList.remove("marked");
            }else{
                session.game.cm[pos]=1;
                document.getElementById("square" + pos).classList.add("marked");
            }
        }
    }
}

function is_bingo(user){
    if(typeof(user)=='undefined') user=session.user;
    if(session.challenge==null || typeof(session.challenge)=='undefined' ||
        typeof(session.challenge.u[user].carton)=='undefined')
            return false;
    for(var num of session.challenge.u[user].carton){ // better to just do a normal "for"
        var pos=session.challenge.u[user].carton.indexOf(num); // and then this is not needed
        if(num!=-1 && session.challenge.bolas.indexOf(num)==-1){
            if(user==session.user){
                session.game.cm[pos]=0;
                if(document.getElementById("square" + pos) !== null)
                    document.getElementById("square" + pos).classList.remove("marked");
                session.game.tmpError=num;
            }
            return false;
        }
    }
    return true;
}
function check_bingo(user){
    if(typeof(user)=='undefined') user=session.user;
    if(!is_bingo(user)){
        open_js_modal_content_accept("<br />El bingo no es correcto. El [["+session.game.tmpError+"]] no ha salido.<br /><br />");
        session.game.tmpError="";
        return;
    }else{
        //move to game over
        session.challenge.cantadores.push(user);
        if(session.challenge.cantadores[0]==""){
            session.challenge.cantadores.shift();
        }
        activity_timer.stop();
        var updates = {};
        updates['challenges/'+session.challenge_name+'/game_status'] = 'over';
        updates['challenges/'+session.challenge_name+'/cantadores'] = session.challenge.cantadores;
        let timestamp=session.timestamp;
        timestamp=timestamp.getFullYear()+"-"+
        pad_string((timestamp.getMonth()+1),2,"0") + "-" + pad_string(timestamp.getDate(),2,"0") + "_" +
         pad_string(timestamp.getHours(),2,"0") + ""  + pad_string(timestamp.getMinutes(),2,"0");
        updates['challenges-log/'+session.challenge_name+'_'+timestamp+'/'] = session.challenge;
        firebase.database().ref().update(updates);
    }
}




function is_linea_x(user,arr){
    if(typeof(user)=='undefined') user=session.user;
    for(var pos of arr){ // better to just do a normal "for"
        var num=session.challenge.u[user].carton[pos]; // and then this is not needed
        if(num!=-1 && session.challenge.bolas.indexOf(num)==-1){
            if(user==session.user){
                session.game.cm[pos]=0;
                document.getElementById("square" + pos).classList.remove("marked");
                session.game.tmpError=num;
            }
            return false;
        }
    }
    return true;
}
function is_linea(user){
    if(typeof(user)=='undefined') user=session.user;
    if(
        is_linea_x(user,[0,3,6, 9,12,15,18,21,24]) ||
        is_linea_x(user,[1,4,7,10,13,16,19,22,25]) ||
        is_linea_x(user,[2,5,8,11,14,17,20,23,26])
       ){
           return true;
    }
    return false;
}

function check_linea(user){
    if(typeof(user)=='undefined') user=session.user;
    var updates = {};
    var question='<b>¡'+user+'</b> ha cantado línea!<br />';
    if(!is_linea(user)){
        question+=" la línea <b>no es correcta</b>.<br />El [["+session.game.tmpError+"]] no ha salido.<br />";
    }else{
        question+=' la línea es ¡<b>correcta</b>!<br />';
        updates['challenges/'+session.challenge_name+'/linea'] = user;
    }
    //move to linea
    updates['challenges/'+session.challenge_name+'/question'] = question;
    firebase.database().ref().update(updates);
}



/*function all_answered(challenge){
    for (var user in challenge.u){
        if(challenge.u[user].answer==undefined || challenge.u[user].answer==null || challenge.u[user].answer=='') return false;
    }
    console.log('all answered true');
    return true;
}*/

function get_inviter(){
    for(var u in session.challenge.u){
        if (session.challenge.u[u].role=="inviter") return u;
    }
}

var get_session_master=function(challenge){
    return Object.keys(challenge.u).sort()[0];
}

function get_winner_string(){
    var winner=[];
    for(var u in session.challenge.u){
        if(is_bingo(u)){
            winner.push(u);
        }
    }
    return "Ganadores ("+winner.length+"): "+winner.join(", ");
}



var QueryString=get_query_string();
var debug=false;
var user_bypass=undefined;
if(QueryString.hasOwnProperty('debug') && QueryString.debug=='true') debug=true;

// responsive tunings
prevent_scrolling();

var mobile_without_wakelock=false;
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && ( !('wakeLock' in navigator) && !('getWakeLock' in navigator) && !('requestWakeLock' in navigator)  && !('WakeLock' in window) )) {
    mobile_without_wakelock=true;
}

var is_app=is_cordova();
if(is_app){
    console.log('is_app');
    if (!window.cordova) alert("ERROR: Running cordova without including cordova.js!");
	document.addEventListener('deviceready', onDeviceReady, false);
}else{
    onDeviceReady();
}

function onDeviceReady() {
    document.removeEventListener('deviceready', onDeviceReady, false);
    console.log('userAgent: '+navigator.userAgent+' is_app: '+is_app);
    if(is_app){
        admob.createBannerView(
        {
          publisherId:          "ca-app-pub-3940256099942544/6300978111",
          adSize:               admob.AD_SIZE.SMART_BANNER,
          tappxShare:           0,
         // isTesting:            true,
          bannerAtTop:          false,
          overlap:              true,
          autoShowBanner:       false,
          autoShowInterstitial: false
        }
        );   //admob.AD_SIZE.BANNER  true ca-app-pub-1143362957092180/2727794713
    }
	menu_screen(); // <----- entry point
}

// window.onload = function () does not work for apps
/*window.onload = function () { 
	if(debug) console.log("win.onload");
	//var splash=document.getElementById("splash_screen");
	//if(splash!=null && (ResourceLoader.lazy_audio==false || ResourceLoader.not_loaded['sounds'].length==0)){ splash.parentNode.removeChild(splash); }
}*/











