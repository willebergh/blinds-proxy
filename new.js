
const WebSocketClient = require("websocket").client;

module.exports = (api) => {
    api.registerAccessory('CustomWebSocketWindowCoveringAccessory', CustomWebSocketWindowCoveringAccessory);
};


class CustomWebSocketWindowCoveringAccessory {
  
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
  
        this.Service = this.api.hap.Service;
        this.Characteristic = this.api.hap.Characteristic;
  
        // extract name from config
        this.name = config.name;
        this.ip = config.ip;

        this.currentPosition = null;
        this.currentTarget = null;
        this.positionState = null;

        this.handleTargetPositionSet = this.handleTargetPositionSet.bind(this);

        // Open websocket connection
        const client =  new WebSocketClient();
        
        // On connection fail
        client.on("connectFailed", error => {
            this.log.debug("Failed connection to websocket: " + error.toString())
        })

        // On connection success
        client.on("connect", connection => {
            this.connection = connection;
            this.log.debug("Connected to websocket!");

            connection.on('error', error => {
                this.log.debug("Connection Error: " + error.toString());
            });
            
            connection.on('close', () => {
                this.log.debug('echo-protocol Connection Closed');
            });

            connection.on('message', message => {
                const data = JSON.parse(message.utf8Data);
               
                this.currentTarget = 100 - data.set;
                this.currentPosition = 100 - data.position;

                this.service.getCharacteristic(this.Characteristic.PositionState).updateValue(this.__calcPosState())
                
                this.service.updateCharacteristic(this.Characteristic.PositionState, this.__calcPosState())
                this.service.updateCharacteristic(this.Characteristic.TargetPosition, this.currentTarget)
                this.service.updateCharacteristic(this.Characteristic.CurrentPosition, this.currentPosition)

                this.log.debug("New message!");
                this.log.debug(data);
            });
            this.connection.send("(UPDATE)")
        })

        client.connect(`ws://${this.ip}:81/`);
    }

    __calcPosState() {
        let currentValue;
      
        if (this.currentPosition === this.currentTarget) {
            currentValue = this.Characteristic.PositionState.STOPPED;
        }
        
        if (this.currentTarget > this.currentPosition) {
            currentValue = this.Characteristic.PositionState.DECREASING;
        } 
        
        if (this.currentTarget < this.currentPosition) {
            currentValue = this.Characteristic.PositionState.INCREASING;
        }
      return currentValue;
    }
  
    /**
     * Handle requests to get the current value of the "Current Position" characteristic
     */
    handleCurrentPositionGet() {
      this.log.debug('Triggered GET CurrentPosition');
      return this.currentPosition;
    }
  
  
    /**
     * Handle requests to get the current value of the "Position State" characteristic
     */
    handlePositionStateGet() {
      this.log.debug('Triggered GET PositionState');
      return this.__calcPosState();
    }
  
  
    /**
     * Handle requests to get the current value of the "Target Position" characteristic
     */
    handleTargetPositionGet() {
      this.log.debug('Triggered GET TargetPosition');
      return this.currentTarget;
    }
  
    /**
     * Handle requests to set the "Target Position" characteristic
     */
    handleTargetPositionSet(value) {
        this.connection.send(100 - value)
        this.log.debug('Triggered SET TargetPosition:'+ value);
    }

    getServices() {

        this.informationService = new this.api.hap.Service.AccessoryInformation()
                .setCharacteristic(this.Characteristic.Manufacturer, "berget")
                .setCharacteristic(this.Characteristic.Model, "blinds1");


             // create a new Window Covering service
            this.service = new this.Service.WindowCovering(this.name);
    
            // create handlers for required characteristics
            this.service.getCharacteristic(this.Characteristic.CurrentPosition)
            .onGet(this.handleCurrentPositionGet.bind(this));
    
            this.service.getCharacteristic(this.Characteristic.PositionState)
            .onGet(this.handlePositionStateGet.bind(this));
    
            this.service.getCharacteristic(this.Characteristic.TargetPosition)
            .onGet(this.handleTargetPositionGet.bind(this))
            .onSet(this.handleTargetPositionSet.bind(this));


        return [this.service, this.informationService];
    }
  
  }