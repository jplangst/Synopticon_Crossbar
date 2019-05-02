///////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) Crossbar.io Technologies GmbH and/or collaborators. All rights reserved.
//
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//  1. Redistributions of source code must retain the above copyright notice,
//     this list of conditions and the following disclaimer.
//
//  2. Redistributions in binary form must reproduce the above copyright notice,
//     this list of conditions and the following disclaimer in the documentation
//     and/or other materials provided with the distribution.
//
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
//  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
//  ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
//  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
//  CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
//  SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
//  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
//  CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
//  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
//  POSSIBILITY OF SUCH DAMAGE.
//
///////////////////////////////////////////////////////////////////////////////

const https = require('https');

var autobahn = require('autobahn');

var connection = new autobahn.Connection({
   url: 'ws://127.0.0.1:8080/ws',
   realm: 'realm1'
 }
);

var availablePublishers = [];

connection.onopen = function (session) {
   function registerPublisher(evt, kwevt, details) {
     if(evt[0] === "add") { //first argument is the type of event: add or remove
       var canAdd = true;
       for(var i = 0; i < availablePublishers.length; i++) {
         if(availablePublishers[i][0] === evt[1][0]) {
           canAdd = false;
           break;
         }
       }
       if(canAdd) {
         availablePublishers.push([evt[1], details.caller]); //second argument is the information of the publisher
         console.log(availablePublishers);
         console.log("broadcast");
         session.publish('ComponentMetaData', ['add', evt[1]]); //either subscribe to this topic or call remote function to get list of publishers in real-time
       }
     }
    //  else if(evt[0] === 'remove') {
    //    for(var i = 0; i < availablePublishers.length; i++) {
    //      if(availablePublishers[i][0] === evt[1][0]) {
    //        availablePublishers.splice(i,1);
    //        session.publish('ComponentMetaData', ['remove', evt[1]]);
    //        break;
    //      }
    //    }
    //  }
   }

   session.register('registerPublisher', registerPublisher).then(
   function (registration) {
      console.log("Procedure registered: ", registration.id);
   },
   function (error) {
      console.log("Registration failed:", error);
   });

   //==================================================================
   function getAvailablePublishers() {
     return availablePublishers;
   }

   session.register('getAvailablePublishers', getAvailablePublishers).then(
   function (registration) {
      console.log("Procedure registered: ", registration.id);
   },
   function (error) {
      console.log("Registration failed:", error);
   });

   function on_session_leave(args) {
     for(var i = 0; i < availablePublishers.length; i++) {
       if(availablePublishers[i][1] === args[0]) {
         console.log('onleave ' + args[0]);
         session.publish('ComponentMetaData', ['remove', availablePublishers[i][0]]);
         availablePublishers.splice(i,1);
         console.log(availablePublishers);
         break;
       }
     }
   }

   //====================== To launch servers on local machine running crossbar ===============
   function on_open_etg_server(args) {
       console.log("synopticon_server msg recieved: " + args);
       var filepath = '../../EyeTrackingServer_WAMP/Release/NewEyeTrackingServer.exe'
       var serverData = "--iviewetg 127.0.0.1 --show-scene-h264-with-gaze --crossbarAddress 127.0.0.1:8080 --glassesID HFES";
       require('child_process').exec('start' + filepath + ' ' + serverData);
   }
   session.subscribe("synopticon_server_protocol", on_open_etg_server);
   //=====================

   session.subscribe("wamp.session.on_leave", on_session_leave);
};

connection.open();

process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    if (options.cleanup) {
      connection.close();
      console.log('clean');
    }
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
