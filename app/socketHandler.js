module.exports = function(io, streams,app,geoip) {
  var clients = {};
  var reflected = [];
  var geo;
  var User = require('./model/user');
  var Friend = require('./model/friend');
  io.on('connection', function(client) {
    console.log('-- ' + client.id + ' joined --');

      // console.log('connection :', client.request.connection._peername);

    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for( var i=0; i < 5; i++ )
          text += possible.charAt(Math.floor(Math.random() * possible.length));

    if(clients.hasOwnProperty(text)) {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      for( var i=0; i < 5; i++ )
          text += possible.charAt(Math.floor(Math.random() * possible.length));
      //clients[text] = client.id;
    } else {
        //clients[text] = client.id;
    }
      
    client.on('readyToStream', function(options) {
      console.log('-- ' + client.id + ' is ready to stream --');
      streams.addStream(client.id, options.name); 

    });
    
    client.on('update', function(options) {
      streams.update(client.id, options.name);
    });

    client.on('resetId', function(options) {
      clients[options.myId] = client.id;
      console.log("resetId  "+ options.myId +" ، client.id : " +  client.id);
      client.emit('id', options.myId);
      reflected[text] = options.myId;
    });
    client.on('geo', function(options) {


      var address=client.conn.remoteAddress;
      var idx = address.lastIndexOf(':');
      if (~idx && ~address.indexOf('.')) {

        address = address.slice(idx + 1);
      }
      console.log(address);

      geo = geoip.lookup(address);

      console.log(geo);

        client.emit('geo', geo);

    });

    client.on('message', function (details) {
      console.log("message function "+ details.to);
      var otherClient = io.sockets.connected[clients[details.to]];
      if (!otherClient) {
        return;
      }

      delete details.to;
      details.from = reflected[text];

      otherClient.emit('message', details);
    });
    client.on('messageapp', function (details) {
      console.log("messageapp function "+ details.to);
      var otherClient = io.sockets.connected[clients[details.to]];
      if (!otherClient) {
        console.log("messageapp function not Found "+ details.to);

        return;
      }

      delete details.to;
      details.from = reflected[text];

      otherClient.emit('messageapp', details);
    });
    client.on('startclient', function (details) {
      User.findOne({id: reflected[text]}, function(err, user) {
        if(user){
          var otherClient = io.sockets.connected[clients[details.to]];
          details.from = reflected[text];
          details.name = user.name;
          otherClient.emit('receiveCall', details);
        }else{
          var otherClient = io.sockets.connected[clients[details.to]];
          details.from = reflected[text];
          otherClient.emit('receiveCall', details);
        }

      });
        
    });

    client.on('ejectcall', function (details) {
      var otherClient = io.sockets.connected[clients[details.callerId]];
      otherClient.emit("ejectcall");
      console.log('--------------------------------------ejectcall-------------------------');
    });

    client.on('removecall', function (details) {
      console.log('--------------------------------------removecall-------------------------');
      var otherClient = io.sockets.connected[clients[details.callerId]];
      otherClient.emit("removecall");
    });

    // client.on('removevideo', function (details) {
    //   var otherClient = io.sockets.connected[clients[details.other]];
    //   otherClient.emit("removevideo");
       
    // });

    client.on('acceptcall', function (details) {

      var otherClient = io.sockets.connected[clients[details.callerId]];
      otherClient.emit("acceptcall",details);
       
    });

    client.on('chat', function(options) {
      var otherClient = io.sockets.connected[clients[options.to]];
      otherClient.emit('chat', options);
    });

    function leave() {
      console.log('-- ' + client.id + ' left --');
      streams.removeStream(client.id);
    }

    client.on('disconnect', leave);
    client.on('leave', leave);
  });

  var getStatus = function(req, res) {
      var clientid = clients[req.params.id];
      //console.log("lien minh get user statys"+clientid+ " "+req.params.id);
      if(io.sockets.connected[clientid]!=undefined){
        res.send({status: 1});
      }else{
        res.send({status: -1});
      }
    };

  app.get('/status/:id', getStatus);
};

