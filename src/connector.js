/**
 * TernLight: Javascript Library for draw flow-chart,Based on HTML5 CANVAS API.
 * 
 * @author fancimage
 * @Copyright 2013 fancimage@gmail.com Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
 
(function(){

tern.classdef('ShapeConnector',tern.Connector,{
  ShapeConnector: function(x,y){
    tern.Connector.call(this,x,y);
    this.draggable = false;
    this.attachedConnectors = []
    this.__isStress = false;
    this.width = this.height = tern.Connector.width;
  },

  paint: function(context) {
    context.strokeStyle = tern.Connector.strokeStyle;
    
    var w = this.width;
    if(this.__isStress || this._state == tern.ItemState.Hover){
        context.fillStyle = tern.Connector.stressdBrush;
        w += w;
    }else{
        context.fillStyle = tern.Connector.fillStyle;
    }
        
    context.strokeRect(-w,-w ,w+w,w+w);
    context.fillRect(-w,-w ,w+w,w+w);
  },
  
  onHovered: function(flag){
      this._state = (flag ? tern.ItemState.Hover:tern.ItemState.Normal); 
      if(flag) this.visible = true;
      else if(!this.parent.isSelected()) this.visible = false;      
  },

  stress: function(flag){
      this.__isStress = flag;
      //var w = tern.Connector.width;
      //if(flag) w += w;
      //this.width = this.height = w;
  },

  move: function(x,y){
    for(var i=0;i<this.attachedConnectors.length;i++){
        var ct = this.attachedConnectors[i];
        if(!ct.parent.draggable()){
            ct.move(x,y);
        }
    }
  },

  addAttached: function(ct){
    if(ct.attachTo != null){
        if(ct.attachTo == this) return;
        ct.attachTo.removeAttached(ct);
    }
    
    ct.attachTo = this;
    this.attachedConnectors[this.attachedConnectors.length] = ct;
  },

  removeAttached: function(ct){
    var idx = this.attachedConnectors.indexOf(ct);
    if(idx >= 0 && idx < this.attachedConnectors.length){
        ct.attachTo = null;
        this.attachedConnectors.splice(idx, 1);
    }
  },

  connectTo: function(ct,polys){
      if(ct == null || ct.type != tern.ConnectorType.Attachable || this==ct) return null;

      var line = null;
      if(null == polys){
          line = new tern.Connection([this.getPoint(),ct.getPoint()],tern.LineType.Straight);
      } else {
          polys=polys.split(',');
          var points = [this.getPoint()];

          var current = points[0];
          var last = ct.getPoint();
          for(var i=0;i<polys.length;i++){
              var s = polys[i];
              if(s==null ||s==''){
                  throw Error("connector.connectTo:illegal arguments!");
              }

              if(s == 'v'){
                  var p = new tern.Point(current.x,last.y);
                  if(current.x != p.x || current.y != p.y){
                      points.push(p);
                  }
                  break;
              }
              else if(s == 'h'){
                  var p = new tern.Point(last.x,current.y);
                  if(current.x != p.x || current.y != p.y){
                      points.push(p);
                  }
                  break;
              }
              else{
                  var pre = s.substr(0,1);
                  var left = s.substr(1);
                  var n = parseInt(s);
                  if( isNaN(n) ){
                      n = parseInt(left);
                      if( isNaN(n) ){
                          throw Error("connector.connectTo:illegal arguments("+polys+")!");
                      }
                  } else {
                      pre = 'v'; //default
                  }

                  if(pre=='h'){
                      p = new tern.Point(current.x+n,current.y);
                  } else {
                      p = new tern.Point(current.x,current.y+n);
                  }

                  if(p.x == last.x && p.y==last.y){
                      break;
                  }
                  points.push(p);
                  current = p;
              }
          }

          points.push(last);
          line = new tern.Connection(points,tern.LineType.RightAngle);
      }

      line._createConnectors();

      this.addAttached(line.connectors[0]);
      ct.addAttached(line.connectors[line.connectors.length-1]);
      return line;
  },

});

tern.classdef('LineConnector',tern.Connector,{
  nullBrush: 'red',
  
  LineConnector: function(x,y,type){
    tern.Connector.call(this,x,y);
    if(!type) this.type = tern.ConnectorType.Endpoint;
    else this.type = type;
    this.attachable = tern.AttachType.None;
    
    if(type == tern.ConnectorType.Endpoint){
        this.width = this.height = tern.Connector.width;
    }
  },

  isStartPoint: function(){
      if(this.parent && this.parent.connectors){
          if(this == this.parent.connectors[0]) return true;
      }
      return false;
  },

  paint: function(context) {
    context.strokeStyle = tern.Connector.strokeStyle;
    context.fillStyle = tern.Connector.fillStyle;
    var w = tern.Connector.width;
    
    context.beginPath();
    
    switch(this.type){
    case tern.ConnectorType.RightAngle:
        {            
            context.moveTo(0,-w);
            
            context.lineTo(w,0);
            context.lineTo(0,w);
            context.lineTo(-w,0);
            //context.lineTo(0,-w);
            context.closePath();
            context.stroke();
            context.fill();
        }
        break;
    case tern.ConnectorType.Middle:
        {
            context.arc(0, 0, w, 0, Math.PI * 2, 0);
            context.fill();
        }
        break;
    default:
        {
            if(this.attachTo == null) context.fillStyle = tern.LineConnector.nullBrush;
            context.strokeRect(-w,-w ,w+w,w+w);
            context.fillRect(-w,-w ,w+w,w+w);
        }
        break;
    }          
  },

  beginDrag: function(){
    if(this.parent.type == tern.LineType.RightAngle){
        return tern.RightAngleDrager.beginDrag(this);
    }else return null;
  },

  move: function(x,y){
    if(this.type != tern.ConnectorType.Endpoint || this.parent.draggable()) return;
    
    this.x += x;
    this.y += y;
    
    if (this.parent.type != tern.LineType.RightAngle){
        this.parent.adjust();
        return;
    }
        
    var cts = this.parent.connectors;
    var count = cts.length;
    if (3 == count){
        var x1 = cts[1].x;
        var y1 = cts[1].y;
        var x2 = cts[1].x;
        var y2 = cts[1].y;
        if ( cts[0].x - cts[2].x == 0){
            x1 = cts[0].x;
            x2 = cts[2].x;
            y1 = y2 = (cts[0].y + cts[2].y)/2;
        }else {
            y1 = cts[0].y;
            y2 = cts[2].y;
            x1 = x2 = (cts[0].x + cts[2].x)/2;
        }
        
        var newCT = new tern.LineConnector(x1,y1, tern.ConnectorType.RightAngle);
        this.parent.insertConnector(1,newCT);
        
        newCT = new tern.LineConnector(x2,y2, tern.ConnectorType.RightAngle);
        this.parent.insertConnector(3,newCT);               
    }else if(3 < count){
        i = cts.indexOf(this);
        var c1 = null, c2 = null;
        if(i == 0){
            c1 = cts[1];
            c2 = cts[2];
        }else if(i == count - 1){
            c1 = cts[i - 1];
            c2 = cts[i - 2];
        }else{
            return;
        }
        
        if(0 == c1.x - c2.x){
            c2.x += x;
        }else{
            c2.y += y;
        }
    }
    
    this.parent.adjust();
  },
});

tern.classdef('RightAngleDrager',{
  RightAngleDrager: function(){        
    this.newX = 0;
    this.newY = 0;
    this.newX2 = 0;
    this.newY2 = 0;
    
    this.preX = 0;
    this.preY = 0;
    this.nextX = 0;
    this.nextY = 0;
    
    this._dashLine = new tern.util.DashedLine();
  },

  _init: function(){
    this.preMoveType=0;
    this.nextMoveType=0; //0:can not be moved  1:move in horizontal line   2: move in virtical line
    
    if (this.ct.type == tern.ConnectorType.Endpoint){
    }else if (this.ct.type == tern.ConnectorType.RightAngle){
        if (this.pre == null || this.next == null) return;
        if (this.pre.attachTo == null){
            if (this.lastY == this.pre.y) this.preMoveType = 2;
            else this.preMoveType = 1;
        }
        if (this.next.attachTo == null){
            if (this.lastY == this.next.y) this.nextMoveType = 2;
            else this.nextMoveType = 1;
        }
    }else if (this.ct.type == tern.ConnectorType.Middle){
        if (this.pre != null && this.next != null){
            if (this.pre.y == this.next.y){
                this.preMoveType = 2;
                this.nextMoveType = 2;
            }else{
                this.preMoveType = 1;
                this.nextMoveType = 1;
            }
        }
    }
    
    if (this.pre != null){
        this.newX = this.preX = this.pre.x;
        this.newY = this.preY = this.pre.y;
    }
    if (this.next != null){
        this.newX2 = this.nextX = this.next.x;
        this.newY2 = this.nextY = this.next.y;
    }
  },

  paint: function(context){
    context.strokeStyle = 'black';
    this._dashLine.context = context;
    context.beginPath();

    if (this.ct.type == tern.ConnectorType.Endpoint){
    }else if (this.ct.type == tern.ConnectorType.RightAngle){
        if (this.preMoveType != 0){
            this._dashLine.moveTo(this.preX,this.preY);
            this._dashLine.lineTo(this.lastMoveX,this.lastMoveY);
            if( this.nextMoveType != 0 ){
                this._dashLine.lineTo(this.nextX,this.nextY);               
                this._dashLine.moveTo(this.lastMoveX,this.lastMoveY);
            }
            this._dashLine.lineTo(this.lastX,this.lastY);
        } else if (this.nextMoveType != 0){
            this._dashLine.moveTo(this.nextX,this.nextY);
            this._dashLine.lineTo(this.lastMoveX,this.lastMoveY);
            this._dashLine.lineTo(this.lastX,this.lastY);
        }        
    }else if (this.ct.type == tern.ConnectorType.Middle){
        //connectors trace
        this._dashLine.moveTo(this.lastMoveX,this.lastMoveY);
        this._dashLine.lineTo(this.lastX,this.lastY);
        
        //new line
        this._dashLine.moveTo(this.newX,this.newY);
        this._dashLine.lineTo(this.newX2,this.newY2);
        
        //pre:old point and new point
        if(this.pre.attachTo != null 
         || this.pre.type != tern.ConnectorType.Endpoint){
            this._dashLine.moveTo(this.pre.x,this.pre.y);
            this._dashLine.lineTo(this.newX,this.newY);
        }
        
        //next:old point and new point
        if(this.next.attachTo != null 
         || this.next.type != tern.ConnectorType.Endpoint){
            this._dashLine.moveTo(this.next.x,this.next.y);
            this._dashLine.lineTo(this.newX2,this.newY2);
        }                
    }
    
    context.stroke();
  },

  move: function(x,y){
    this.lastMoveX = this.lastMoveX + x;
    this.lastMoveY = this.lastMoveY + y;
    
    if (this.ct.type == tern.ConnectorType.Endpoint){
    }else if (this.ct.type == tern.ConnectorType.RightAngle){
        this._onRightAngleMove();
    }else if (this.ct.type == tern.ConnectorType.Middle){
        this._onMiddleMove();
    }else{
        return;
    }
  },

  _onMiddleMove: function(){
    this.newX = this.pre.x;
    this.newY = this.pre.y;
    
    if (this.preMoveType == 1) this.newX = this.lastMoveX;
    else this.newY = this.lastMoveY;
    
    if (this.pre.attachTo == null){
        if (this.preMoveType == 1) this.preX = this.lastMoveX;
        else this.preY = this.lastMoveY;
    }
    
    this.newX2 = this.next.x;
    this.newY2 = this.next.y;
        
    if (this.nextMoveType == 1) this.newX2 = this.lastMoveX;
    else this.newY2 = this.lastMoveY;
    
    if (this.next.attachTo == null){
        if (this.nextMoveType == 1) this.nextX = this.lastMoveX;
        else this.nextY = this.lastMoveY;
    }
  },

  _onRightAngleMove: function(){
    if (this.preMoveType == 1){
        this.preX = this.lastMoveX;
    } else if (this.preMoveType == 2){
        this.preY = this.lastMoveY;
    } else {
        if (this.lastX == this.pre.x) this.lastMoveX = this.lastX;
        else this.lastMoveY = this.lastY;
    }
    
    if (this.nextMoveType == 1){
        this.nextX = this.lastMoveX;
    } else if (this.nextMoveType == 2){
        this.nextY = this.lastMoveY;
    } else {
        if (this.lastX == this.next.x) this.lastMoveX = this.lastX;
        else this.lastMoveY = this.lastY;
    }
  },

  commit: function(){
    if (this.ct == null) return;
    
    var cn = this.ct.parent;
    cn._connectorDrager = null;
    
    var i = cn.connectors.indexOf(this.ct);
    if(i<0) return;
    
    if (this.ct.type == tern.ConnectorType.Endpoint){
    }else if (this.ct.type == tern.ConnectorType.RightAngle){
        if (this.preMoveType != 0){
            this.pre.x = this.preX;
            this.pre.y = this.preY; //change pre-point
        }
        if (this.nextMoveType != 0){
            this.next.x = this.nextX;
            this.next.y = this.nextY; //change next-point
        }
    }else if (this.ct.type == tern.ConnectorType.Middle){
        if (this.preMoveType == 0) return;
        
        this.pre.x = this.preX;
        this.pre.y = this.preY;
        this.next.x = this.nextX;
        this.next.y = this.nextY;
        
        if (this.next.attachTo != null){
            cn.insertConnector(i+1, new tern.LineConnector(this.newX2,this.newY2, tern.ConnectorType.RightAngle) );
        }
        if (this.pre.attachTo != null){
            cn.insertConnector(i, new tern.LineConnector(this.newX,this.newY, tern.ConnectorType.RightAngle) );                    
        }
    }
    
    this.ct.x = this.lastMoveX;
    this.ct.y = this.lastMoveY;
    
    cn.adjust();
  },

  cancel: function(){
    if (this.ct == null) return;
    //ct._connectorDrager = null;
    this.ct.parent._connectorDrager = null;
    this.ct = null;
  },

  movable: function(){return this.preMoveType != 0 || this.nextMoveType != 0;},
});

tern.RightAngleDrager.beginDrag = function(ct){
    if(ct==null || ct.type == tern.ConnectorType.Endpoint 
       || ct.type == tern.ConnectorType.Attachable){
        return null;
    }
    
    var cts = ct.parent.connectors;
    var idx = cts.indexOf(ct);
    if(idx < 0) return null;
        
    var step = 0;
    if(ct.type == tern.ConnectorType.RightAngle){
        step = 2;        
    }else if(ct.type == tern.ConnectorType.Middle){
        step = 1;
    }else return null;
    
    var pre = null, next = null;
    var i = idx - step;
    if (i < 0 || i >= cts.length) return;        
    pre = cts[i];
        
    i = idx + step;
    if (i < 0 || i >= cts.length) return;
    next = cts[i];
    
    //if (next == null && pre == null) return null;
    
    var ret = new tern.RightAngleDrager();
    ret.ct = ct;
    ret.next = next;
    ret.pre = pre;

    ret.lastX = ct.x;
    ret.lastY = ct.y;
    ret.lastMoveX = ct.x;
    ret.lastMoveY = ct.y;
    
    ret._init();
    
    if (ct.parent._connectorDrager != null){
        ct.parent._connectorDrager.cancel();  //it is abnormal!!
    }
    ct.parent._connectorDrager = ret;

    return ret;
}

})();