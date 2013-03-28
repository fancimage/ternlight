/**
 * TernLight: Javascript Library for draw flow-chart,Based on HTML5 CANVAS API.
 * 
 * @author fancimage
 * @Copyright 2013 fancimage@gmail.com Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
 
(function(window){

var Ghost = function(){
    //casual.DisplayObject.call(this);
    //this.mouseEnabled = false;
    this.visible = false;
}
//tern.extends(Ghost, casual.DisplayObject);

Ghost.prototype.paint = function(context) {
    //context.save();
    context.fillStyle ='rgba(201, 218, 217,120)';
    context.strokeStyle = 'green';
    context.fillRect(this.x,this.y,this.width,this.height);
    context.strokeRect(this.x,this.y,this.width,this.height);
    //context.restore();
}

tern.classdef('UndoManager',{
  UndoManager: function(level){
      this.level = level;
      this.undoList=[];
      this.redoList=[];
  },
  
  clear: function(){
    this.undoList.splice(0);  //remove all
    this.redoList.splice(0);
  },

  addCommand: function(cmd){
    if(this.level <= 0) return;
    if(this.undoList.length >= this.level){
        this.undoList.shift(); //delete the first element
    }
    
    this.undoList.push(cmd);
    this.redoList.splice(0); //clear redo-list
  },

  canUndo: function(){return this.undoList.length > 0;},

  canRedo: function(){return this.redoList.length > 0;},

  undo: function(){
    if( !this.canUndo() ) return;
    
    var cmd = this.undoList.pop();
    cmd.undo();
    this.redoList.push(cmd);
  },

  redo: function(){
    if( !this.canRedo() ) return;
    
    var cmd = this.redoList.pop();
    cmd.redo();
    this.undoList.push(cmd);
  },
});

/*
 * Diagram class
 */ 
tern.classdef('Diagram',tern.UIContainer,{
  Diagram: function(canvas){   /*constructor*/
    if (typeof canvas === 'string'){
        if (canvas.indexOf("#") == 0) {
	        canvas = canvas.substring(1);
	    }
                
        canvas = window.document.getElementById(canvas);
    }
    
    if(canvas == null) throw Error("Canvas can't be null!");
	tern.UIContainer.call(this);  //super constructor
        
    this.context = canvas.getContext("2d");
    
    this.width  = canvas.width;
    this.height = canvas.height;
    
    this.__selItems = [];
    this.__selConnector = null;
    this.__ghost = new Ghost();
    this.__timerid = null;
    this.__interval = -1;
    this.undoManager = new tern.UndoManager();
    this._ToolDrager = new tern._ToolDrager(this);
    
    this.__moveX = 0;
    this.__moveY = 0;
    
    //actions
    this.actions = [];
    this.addAction(new tern.Actions.HitAction());
    this.addAction(new tern.Actions.MoveAction());
    this.addAction(new tern.Actions.SectionAction());
    this.addAction(new tern.Actions.HoverAction());
              
    //start to paint frames 
    this.setMaxFrameRate(20);
    
    //handler mouse events
    var _mousehandler = tern.delegate(this._onMouseEvent, this);
    canvas.onmousedown = canvas.onmouseup = canvas.onmousemove =_mousehandler;
    
    //handler keyboard events
    canvas.onkeyup = tern.delegate(this._onKeyUp, this);
    canvas.onkeydown = tern.delegate(this._onKeyDown, this);
    if(0 > canvas.tabIndex) canvas.tabIndex = 0; //get focus!
  },
  
  setMaxFrameRate:function(count){
      if(count <= 0) count = 20;
      var interval = 1000/count;
      if(interval == this.__interval) return;
      
	  this.__interval = interval;
	  if(this.__timerid != null) clearInterval(this.__timerid);
	  this.__timerid = setInterval(tern.delegate(this.__timerHandler, this), interval);
  },
  
  __timerHandler: function(){
      this._onPaint(this.context);
  },
  
  _onKeyDown: function(e){
      //alert(e.keyCode);
      var handled = false;
      if(8 == e.keyCode || 46 == e.keyCode){
          this.__deleteSelected(false);
          handled = true;
      }
      else if(e.ctrlKey){
          if(90 == e.keyCode){ //ctrl+z
              this.undoManager.undo();
              handled = true;
          }else if(89 == e.keyCode){ //ctrl+y
              this.undoManager.redo();
              handled = true;
          } else if(65 == e.keyCode){ //ctrl+a
              this.setSelectedItems(this.children); //select all
              handled = true;
          }
      }else{
          if(this.__selItems.length <= 0 || this.__selConnector!=null) return;
          var x = 0, y = 0,step = 2;
          if(e.shiftKey) step = 1;
          
          switch(e.keyCode){
              case 37: //left
                  x -= step;
                  break;
              case 38: //up
                  y -= step;
                  break;
              case 39: //right
                  x += step;
                  break;
              case 40: //down
                  y += step;
                  break;
          };
          
          if (x != 0 || y != 0){
              for(var i=0;i<this.__selItems.length;i++){
                  this.__selItems[i].move(x,y);
              }
              
              this.__moveX += x;
              this.__moveY += y;
              handled = true;
          }
      }
      
      if(handled){
          if(e.preventDefault) e.preventDefault();
      }
  },
  
  _onKeyUp: function(e){
      if(this.__moveX > 0 || this.__moveY > 0){
          cmd = new tern.Commands.MoveCommand(this.getSelectedItems(), this.__moveX, this.__moveY);
          this.undoManager.addCommand(cmd);
          
          this.__moveX = 0;
          this.__moveY = 0;
          if(e.preventDefault) e.preventDefault();
      }
  },
  
  _onMouseEvent: function(e){
    var canvas = this.context.canvas;
    if(e.type == 'mouseup'){
        canvas.focus();
    }
        
    e.mouseX = e.pageX - canvas.offsetLeft;
	e.mouseY = e.pageY - canvas.offsetTop;
    
    var func = function(a){
        f = a[e.type];
        if(f) f.call(a,e);
    }

    for(var i=0;i< this.actions.length;i++){
        func(this.actions[i]);
    }
    
    if(e.preventDefault) e.preventDefault();
  	if(e.stopPropagation) e.stopPropagation();
  },

  drawBackGround: function(context) {
    //context.fillStyle ="#ffff00";
    var gradient = context.createLinearGradient(this.width/2, 0,this.width/2,this.height);
    gradient.addColorStop(0,"#E2EBEF");
    gradient.addColorStop(1,"#5DA3D4");
    context.fillStyle = gradient;
    context.fillRect(0, 0,this.width,this.height);
  },

  paint: function(context) {
    //background
    if(this.drawBackGround){
        this.drawBackGround(context);
    }    
    
    //ghost
    if(this.__ghost.visible){
        this.__ghost.paint(context);
    }
    
    //default style
    //this.context.lineWidth = 1;    
    this.context.strokeStyle = "#000000";
    this.context.fillStyle = '#0c0c0c';
    
    //children
    tern.Diagram.superClass.paint.call(this,context);
  },

  addAction: function(action){
    if(action!=null && this.actions.indexOf(action) < 0){
        action.diagram = this;
        this.actions[this.actions.length] = action;
    }    
  },

  /**
   * Gets the selected diagram-items.
   */
  getSelectedItems: function(){return this.__selItems;},

  /**
   * Sets the selected diagram-items.
   */    
  setSelectedItems: function(items){
    if(items == this.__selItems) return;
    if(items!=null && !(items instanceof Array) ){
        if(!(items instanceof tern.DiagramItem)) return;
        items = [items];
    }
    
    if(this.__selItems.length > 0){
        for(var i=0;i<this.__selItems.length;i++){
            var item = this.__selItems[i];
            if(null == items || items.indexOf(item) < 0){
                item.onSelectedStateChanged(false);
            }
        }
    
        this.__selItems.splice(0,this.__selItems.length); //remove all
    }
    
    if(items != null){
        for(var i=0;i<items.length;i++){
            var item = items[i];
            if(!item.isSelected()){
                item.onSelectedStateChanged(true);
            }
            this.__selItems[this.__selItems.length] = item;
        }
    }
  },

  findConnectorAt: function(x1,y1,x2,y2){
    var pitem = (this.__selConnector==null?null:this.__selConnector.parent);
    var item = null;
    
    this.findElementsIn(x1-2,y1-2,4,4,
        function(child){
            if(pitem == child) return true;
            else{
                item = child;
                return false;
            }
        }
    );
    
    if(null != item && (item instanceof tern.DiagramItem) ){
        return item.findConnector(x1,y1,x2,y2);
    }
    
    return null;
  },

  findAt: function(x,y){
    //in order to select item easily,expand point to rect
    var item = null;//this.findItemsIn(x,y,0,0,true);
    this.findElementsIn(x,y,1,1,
        function(child){
            item = child;
            return false;
        }
    );
    
    if(null != item && (item instanceof tern.DiagramItem)){
        var ct = item.findConnector(x,y,0,0);
        if(ct) return ct;
    }
    
    return item;
  },

  _getSelectedConnector: function(){return this.__selConnector;},

  _setSelectedConnector: function(connector){
    if(this.__selConnector!=connector){
        if(this.__selConnector!=null) this.__selConnector.onSelectedStateChanged(false);
        this.__selConnector = connector;
        if(this.__selConnector!=null) this.__selConnector.onSelectedStateChanged(true);
    }
  },

  getCursor: function(){return this.context.canvas.style.cursor;},

  setCursor: function(v){
      this.context.canvas.style.cursor = v;
  },
  
  __deleteSelected: function(isCut){
      if(this.__selItems.length<=0) return;
      
      if(isCut) this.copy();
      
      cmd = new tern.Commands.AddRemoveCommand(this, this.__selItems, false);
      this.undoManager.addCommand(cmd);
      cmd.redo();
  },
  
  toolbox: function(obj,target,itemClass){
      if(!obj || !target || !itemClass) return;
      
      var diagram = this;
      var canvas = this.context.canvas;
      if (typeof obj == "string") {
          obj = document.getElementById(obj);
      }
      
      if (typeof target == "string") {
          target = document.getElementById(target);
          target.style.position = 'absolute';
          target.style.display = 'none';
          target.style.zIndex = 1000;
          //target.orig_index = obj.style.zIndex;
      }
      
      obj.onmousedown = function (a) {
          if (!a) a = window.event;
          
          var x = a.clientX - document.body.scrollLeft - obj.offsetLeft; 
          var y = a.clientY - document.body.scrollTop - obj.offsetTop;
          target.style.left = (a.clientX + document.body.scrollLeft - x)+'px';
          target.style.top = (a.clientY + document.body.scrollTop - y)+'px';
                    
          diagram._ToolDrager.active(target,itemClass,x,y);
          
          document.onmousemove = function (a) {              
              if (!a) a = window.event;                            
              
              var left = a.clientX + document.body.scrollLeft - x;
              var top = a.clientY + document.body.scrollTop - y;              
              diagram._ToolDrager.move(left,top,false);
          };
          
          document.onmouseup = function () {
              diagram._ToolDrager.deactive();
          };
    }
  },
  
});

tern.classdef('_ToolDrager',{
    _ToolDrager: function(diagram){
        this.diagram = diagram;
        this.deactive();  
    },
    
    active: function(target,itemClass,offsetx,offsety){
        this.target = target;
        this.itemClass = itemClass;
        this._active = true;
        this._offsetX = offsetx;
        this._offsetY = offsety;
        
        this.target.style.cursor = "move";
        this.target.style.display = 'block';
    },
    
    deactive: function(inDiagram){
        if(inDiagram){
            var addCmd = new tern.Commands.AddRemoveCommand(this.diagram,[this.item],true);
            this.diagram.undoManager.addCommand(addCmd);
        } else if(this.item){
            this.diagram.removeChild(this.item);
        }
        
        if(this.target){
            this.target.style.cursor = "normal";
            this.target.style.display = 'none';
        }
        
        this.target = null;
        this.itemClass = null;
        this.item = null;
        this._active = false;
        this._inDiagram = false;
        
        document.onmousemove = null;
        document.onmouseup = null;
    },
    
    isActive: function(){return this._active;},
    
    move: function(x,y,inDiagram){
        if(inDiagram){
            if(!this._inDiagram){
                 if(null == this.item){
                     this.item = new this.itemClass();
                     this.diagram.addChild(this.item);
                     this.target.style.display = 'none';
                     
                     x -= this._offsetX;
                     y -= this._offsetY;
                 }
                 this.item.visible = true;
                 this._inDiagram = true;
                 this.diagram.setSelectedItems(this.item);
            }
            this.item.move(x,y);
        } else {
            this.target.style.left = x + 'px';
            this.target.style.top = y + 'px';
            
            var canvas = this.diagram.context.canvas;
            if(x > canvas.offsetLeft && y>canvas.offsetTop 
                  && x < canvas.offsetLeft+canvas.width && y<canvas.offsetTop+canvas.height){
                this.target.style.display = 'none';
            } else if(this._inDiagram){
                if(this.item!=null) this.item.visible = false;
                this.target.style.display = 'block';
                this._inDiagram = false;
            }
        }
        
        //if(event && event.preventDefault) event.preventDefault();
  	    //if(event && event.preventDefault) event.stopPropagation(); 
    },
});

tern.ItemState = {
    Normal: 1,
    Hover:  2,
    Selected: 3
}

/*
 * action
 */
var Action = tern.classdef('Action',{
  Action: function(){
    this.diagram = null;
    this.state = Action.States.Unactive;
    this._preCursor = null;
  },

  canActivate: function(){
    if(this.state == Action.States.Disable) return false;
    else return this.state == Action.States.Unactive;
  },

  _suspendOtherActions: function(){
    if(this.diagram){
        for(var i=0;i< this.diagram.actions.length;i++){
            var act = this.diagram.actions[i];
            if(act != this) act.state = Action.States.Suspend;
        }
    }
  },

  _unSuspendActions: function(){
    if(this.diagram){
        for(var i=0;i< this.diagram.actions.length;i++){
            var act = this.diagram.actions[i];
            act.state = Action.States.Unactive;
        }
    }
  },

  activate: function(){
    if(this.canActivate()){
        this._suspendOtherActions();
        this.state = Action.States.Active;
        this._preCursor = this.diagram.getCursor();
    }
    
    return this.state == Action.States.Active;
  },

  deActivate: function(){
    if (Action.States.Active == this.state || Action.States.Suspend == this.state){
        if(null != this._preCursor){
            this.diagram.setCursor(this._preCursor);
            this._preCursor = null;
        }
        
        this.state = Action.States.Unactive;
        this._unSuspendActions();
    }
  },
});

tern.Action.States = {
    Disable: 0,
    Active: 1,
    Suspend:2,
    Unactive:3
};

tern.classdef('MouseAction',tern.Action,{
   MouseAction: function(){
     tern.Action.call(this);
  },
  
  mouseup: function(e){},
  mousedown: function(e){},
  mousemove:function(e){},
});

/*
 * DiagramItem class
 */
tern.classdef('DiagramItem', tern.UIContainer,{
  DiagramItem: function(){
    tern.UIContainer.call(this);
    
    this._state = tern.ItemState.Normal;
    this.connectors = [];
  }, 

  move: function(offsetX,offsetY){
    this.x += offsetX;
    this.y += offsetY;
  },

  addConnector: function(child){
    if(this.connectors.indexOf(child) >= 0){
        child.parent = this;
        return child;
    }
    
    if(child.parent) child.parent.removeConnector(child);
    this.connectors[this.connectors.length] = child;
	child.parent = this;
	return child;
  },

  insertConnector: function(index,child){
    if(this.connectors.indexOf(child) >= 0){
        child.parent = this;
        return child;
    }
    
    if(child.parent) child.parent.removeConnector(child);
    this.connectors.splice(index, 0, child);
	child.parent = this;	
	return child;
  },

  removeConnector: function(child){
    return this.removeConnectorAt(this.connectors.indexOf(child));
  },

  removeConnectorAt: function(index){
    if (index < 0 || index > this.connectors.length - 1) return false;
    
    var child = this.connectors[index];
    if(child!=null){
        child.parent = null;
        if(child.attachTo){
            child.attachTo.removeAttached(child);
        }
    }
	this.connectors.splice(index, 1);
	return true;
  },

  isDraggable: function(){
    return this._state == tern.ItemState.Selected;
  },

  isSelected: function(){
    return this._state == tern.ItemState.Selected;
  },

  getState: function(){
    return this._state;
  },

  stress: function(flag){
    for(var i=0;i<this.connectors.length;i++){
        this.connectors[i].visible = flag;
    }
  },

  _onStateChanged: function(lastState){
    var flag = (this._state == tern.ItemState.Selected || this._state == tern.ItemState.Hover);
    this.stress(flag);
  },

  onSelectedStateChanged: function(flag){
    var s = flag?tern.ItemState.Selected:tern.ItemState.Normal;
    if(s!=this._state){
        var last = this._state;
        this._state = s;
        this._onStateChanged(last);        
    }
  },

  onHovered: function(flag){
    if(this._state != tern.ItemState.Selected){
        var s = flag?tern.ItemState.Hover:tern.ItemState.Normal;
        if(s!=this._state){
            var last = this._state;
            this._state = s;
            this._onStateChanged(last);
        }
    }
  },

  findConnector: function(x1,y1,x2,y2){
    if(0 == x2 && 0 == y2){ //hit test
        var bak = this.children;
        this.children = this.connectors;
        var ct = null;
        this.parent.findElementsIn.call(this,x1-2,y1-2,4,4,function(child){
            ct = child;
            return false;
        });
        this.children = bak;
        return ct;
    }else{   //find the near connector
        var distance = 0;
        var ret = null;
        x1 = x1 - this.x;
        y1 = y1 - this.y;
    
        for(var i=0;i<this.connectors.length;i++){
            var x = this.connectors[i].x - x1;
            var y = this.connectors[i].y - y1;
            x = x*x + y*y;
            if(x<distance || distance==0){
                distance = x;
                ret = this.connectors[i];
            }
        }
        return ret;
    }
  },

  paint: function(context){
	for(var i = 0, len = this.connectors.length; i < len; i++){
		var child = this.connectors[i];
		child._onPaint(context);
	}
    
    tern.DiagramItem.superClass.paint.call(this,context);
  },
});

tern.ConnectorType = {
    Attachable: 1,  // can be attached with other connectors  -- shape connector
    Endpoint:  2,   // line's from or to point
    RightAngle: 3,  //in the poly line
    Middle:     4   //in the line
}

/*
 * Connector class
 */
tern.classdef('Connector',tern.UIElement,{
  /*static members*/
  width: 4,
  strokeStyle: 'rgba(175,175,170,255)',
  fillStyle: 'rgba(0, 255, 0,255)',
  stressdBrush: 'red',
  
  Connector: function(x,y){
    tern.UIElement.call(this);
    
    this.x = x;
    this.y = y;
    this.type = tern.ConnectorType.Attachable;
    this.visible = false;
    this.draggable = true;
    this.attachable = true;
    this.attachTo = null;
    this._state = tern.ItemState.Normal;
  },

  getState: function(){return this._state;},

  onHovered: function(flag){
      this._state = (flag && this.visible ? tern.ItemState.Hover:tern.ItemState.Normal);      
  },

  onSelectedStateChanged: function(flag){
      this.visible = flag;
  },
  stress: function(flag){},
  beginDrag: function(){return null;},
});
 
tern.LineType = {
    Straight: 1,
    RightAngle: 2
}
 
 /*
 * Connection class
 */
tern.classdef('Connection',tern.DiagramItem,{ 
  Connection: function(points,type){
    if(points == null || points.lenght < 2){
        throw Error("new Connection:illegal arguments!");
    }

    tern.DiagramItem.call(this);
    this.points = points;
    if(!type) this.type = tern.LineType.RightAngle;
    else this.type = type;
    
    this.strokeStyle = 'black';
    this._connectorDrager = null;
    this._easyHit = true;  //make to select connection easily
    
    this._init();
  },

  _init: function() {
    /*check points*/
    var isAngle = (tern.LineType.RightAngle == this.type);
    var pre = this.points[0];    
    var i = 1;
    while (i < this.points.length - 1){
        var current = this.points[i];
        if(isAngle){
            if( i == this.points.length - 2 ){
                var mTo = this.points[this.points.length - 1];
                if( mTo.x != current.x || mTo.y != current.y ){
                    if(pre.x != current.x || mTo.y != current.y){
                        if( Math.abs(pre.x-mTo.x) < Math.abs(pre.y-mTo.y) ){
                            current = new tern.Point(mTo.x, pre.y);
                        }
                        else{
                            current = new Point(pre.x, mTo.y);
                        }
                    }
                }
            }else if(current.x != pre.x && current.y != pre.y){
                if (Math.abs(current.x - pre.x) <= Math.abs(current.y - pre.y)){
                    current.x = pre.x;
                }else{
                    current.y = pre.y;
                }
            }
            
            this.points[i] = current;
        }
        
        if( current.x == pre.x && current.y == pre.y ){
            //it is no use!
            this.points.splice(i,1);
            continue;
        }else{
            pre = current;
            if (i >= 2){
                var first = this.points[i - 2];
                var second = this.points[i - 1];
                if (((first.x == second.x) && (second.x == current.x))  //in one horizontal line
                      || ((first.y == second.y) && (second.y == current.y))){
                    this.points.splice(i - 1);  //it is no use!
                    continue;
                }
            }
        }
        
        i++;
    }
  },

  _createConnectors: function() {
    var isAngle = (tern.LineType.RightAngle == this.type);
    for (var i = 0; i < this.points.length; i++){
        if (isAngle && i > 0){
            this.addConnector( new tern.LineConnector( (this.points[i].x + this.points[i - 1].x) / 2,
                                      (this.points[i].y + this.points[i - 1].y) / 2 ,
                                      tern.ConnectorType.Middle
                          ));
        }
        
        if (i == 0 || i == this.points.length - 1){
            this.addConnector( new tern.LineConnector( this.points[i].x, this.points[i].y, tern.ConnectorType.Endpoint) );
        }else{
            this.addConnector( new tern.LineConnector( this.points[i].x, this.points[i].y, tern.ConnectorType.RightAngle) );
        }
    }
  },

  paint: function(context) {
    //connectors
    if(this.connectors.length <= 0){
        this._createConnectors();
    }else{
        //adjust?
    }
    
    if(this.connectors.length < 2) return;      
        
    //draw line
    context.strokeStyle = this.strokeStyle;
    context.beginPath();
    context.moveTo(this.connectors[0].x,this.connectors[0].y);  //first point
    
    if(2 == this.connectors.length){
        //it is only a Straight line
        context.lineTo(this.connectors[1].x,this.connectors[1].y);
    }else{
        for (var i = 1; i < this.connectors.length; i++){
            if (this.connectors[i].type == tern.ConnectorType.Middle) continue;
            context.lineTo(this.connectors[i].x,this.connectors[i].y);
        }
    }
    
    //draw the Arrow
    this._createArrow(context);
    
    context.stroke();
    
    if(this._connectorDrager!=null){
        this._connectorDrager.paint(context);
    }
    
    tern.Connection.superClass.paint.call(this,context);
  },

  _onStateChanged: function(lastState){    
    if(this._state == tern.ItemState.Selected
       || lastState == tern.ItemState.Selected){
        var childVisible = this._state == tern.ItemState.Selected;
        for(var i=0;i<this.connectors.length;i++){
            this.connectors[i].visible = childVisible;
        }
    }
    
    if(this._state == tern.ItemState.Selected 
       || this._state == tern.ItemState.Hover ){
        this.strokeStyle = 'blue';
    }else{
        this.strokeStyle = 'black';
    }
  },

  draggable: function(){
    if(this._state == tern.ItemState.Selected){
        if(this.connectors.length >= 2){
            var from = this.connectors[0].attachTo;
            var to = this.connectors[this.connectors.length-1].attachTo;
            if( (from!=null && !from.parent.isSelected()) 
                || (to!=null && !to.parent.isSelected()) ){
                return false;
            }
            return true;
        }
    }
    return false;
  },

  move: function(x,y){
    if(!this.draggable()) return;
    
    for(var i=0;i<this.connectors.length;i++){
        var ct = this.connectors[i];
        ct.x += x;
        ct.y += y;
    }
  },

  adjust: function(){
    if(this.connectors.length < 2) return;
    var isAngle = (tern.LineType.RightAngle == this.type);
    var pre = this.connectors[0];    
    
    var step = 1 , i = 1;
    if (isAngle) step++;  //ingore middle connector
    while( i < this.connectors.length ){
        var current = this.connectors[i];
        //force to make a Right Angle Line? 
        if (isAngle){
            if (current.type == tern.ConnectorType.Middle){
                i++;
                continue;
            }
            
            if( i == this.connectors.length-2 ){
                var mTo = this.connectors[this.connectors.length - 1];
                if(mTo.x != current.x || pre.y != current.y){
                    if(pre.x != current.x || mTo.y != current.y){
                        if (Math.abs(pre.x - mTo.x) < Math.abs(pre.y - mTo.y)){
                            current.x = mTo.x;
                            current.y = pre.y;
                        }else{
                            current.x = pre.x;
                            current.y = mTo.y;
                        }
                    }
                }
            }else if(current.x != pre.x && current.y != pre.y && (i != this.connectors.length - 1) ){
                if (Math.abs(current.x - pre.x) <= Math.abs(current.y - pre.y)){
                    current.x = pre.x;
                }else{
                    current.y = pre.y;
                }
            }
            
            var last = this.connectors[i-1];
            if (last.type != tern.ConnectorType.Middle){
                this.insertConnector(i,new tern.LineConnector( (last.x + current.x) / 2, (last.y + current.y) / 2, tern.ConnectorType.Middle));
                i++;
            }else{
                var last2 = this.connectors[i - 2];
                last.x = (last2.x + current.x) / 2;
                last.y = (last2.y + current.y) / 2;
            }
        }
        
        if(current.x != pre.x || current.y != pre.y){
            pre = current;
            if (i >= step+step ){
                var first = this.connectors[i - step - step];
                var second = this.connectors[i - step];
                if (((first.x == second.x) && (second.x == current.x))  //in one horizontal line
                  || ((first.y == second.y) && (second.y == current.y))){
                      var rct = this.connectors[i - step];
                      this.removeConnectorAt(i - step); //it is no use!
                      if (isAngle){
                          i--;
                          this.connectors[i - 1].x = second.x;
                          this.connectors[i - 1].y = second.y;
                          
                          rct = this.connectors[i - step];
                          this.removeConnectorAt(i - step);
                      }
                      
                      continue;
                }
            }
        }else{
            //it is no use!
            var rct = this.connectors[i];
            var _i = i-1;
            if(!pre.attachTo && rct.attachTo){
                this.removeConnector(pre); 
                _i--;                
            }else this.removeConnectorAt(i);
            
            if (isAngle){
                i--;
                //rct = this.connectors[_i];
                this.removeConnectorAt(_i);
            }
            continue;
        }
        
        i++;
    }
  },
  
  _createArrow: function(context){
     
     var arrowWidth  = 4;   //arrowSize
     var arrowHeight = 8;
     
     var idx = this.connectors.length-2;
     var x1 = this.connectors[idx].x;
     var y1 = this.connectors[idx].y;
     var x2 = this.connectors[idx+1].x;
     var y2 = this.connectors[idx+1].y;
     
     var cpX1,cpX2,cpY1,cpY2;
     
     if(0 == x1 - x2){         
         if(y1 < y2){
             cpX1 = x2 - arrowWidth;             
             cpX2 = x2 + arrowWidth;
             cpY1 = cpY2 = y2 - arrowHeight;             
         } else{
             cpX1 = x2 - arrowWidth;
             cpX2 = x2 + arrowWidth;
             cpY1 = cpY2 = y2 + arrowHeight;             
         }
     } else if(0 == y1 - y2){
         if(x1 < x2){
             cpX1 = cpX2 = x2 - arrowHeight;
             cpY1 = y2 - arrowWidth;
             cpY2 = y2 + arrowWidth;
         } else {
             cpX1 = cpX2 = x2 + arrowHeight;
             cpY1 = y2 - arrowWidth;
             cpY2 = y2 + arrowWidth;
         }
     }else{
         var k = (1.0 * (y1-y2) ) / (x1-x2);
         var xOffset = arrowHeight/(Math.sqrt(1+ k*k));
         
         cpX1 = x2 + xOffset;
         cpY1 = y2 + k*xOffset;
         cpX2 = x2 - xOffset;
         cpY2 = y2 - k*xOffset;
         
         k = (-1.0) / k;
         xOffset = arrowWidth / (Math.sqrt(1 + k * k));
         
         var d1 = (cpX1 - x1) * (cpX1 - x1) + (cpY1 - y1) * (cpY1 - y1);
         var d2 = (cpX2 - x1) * (cpX2 - x1) + (cpY2 - y1) * (cpY2 - y1);
         if (d1 < d2){
             cpX2 = Math.round(cpX1 - xOffset);
             cpY2 = Math.round(cpY1 - k*xOffset);
             
             cpX1 = Math.round(cpX1 + xOffset);  //note: cpX1 changed
             cpY1 = Math.round(cpY1 + k*xOffset);
         } else {
             cpX1 = Math.round(cpX2 + xOffset);
             cpY1 = Math.round(cpY2 + k*xOffset);
             
             cpX2 = Math.round(cpX2 - xOffset);
             cpY2 = Math.round(cpY2 - k*xOffset);
         }
         
     }
     
     context.moveTo(cpX1,cpY1);
     context.lineTo(x2,y2);
     context.lineTo(cpX2,cpY2);
  }
  
});

/*
 * Shape class
 */
tern.classdef('Shape',tern.DiagramItem,{ 
  Shape: function(){
    tern.DiagramItem.call(this);
  },

  move: function(x,y){
    tern.Shape.superClass.move.call(this,x,y);
    
    for(var i=0;i<this.connectors.length;i++){
        this.connectors[i].move(x,y);
    }
  },
});

tern.classdef('RectangleShape',tern.Shape,{
  RectangleShape: function(){
    tern.Shape.call(this);
    this.width = 100;
    this.height = 100;         
  },

  paint: function(context) {
    //context.lineWidth = 1;    
    //context.strokeStyle ="#000000";
    context.fillStyle ="#00ffff";
    context.fillRect(0, 0,this.width,this.height);
    context.strokeRect(0,0 ,this.width,this.height);
    
    //connectors
    if(this.connectors.length <= 0){
        this.addConnector(new tern.ShapeConnector(this.width/2,0));
        this.addConnector(new tern.ShapeConnector(this.width/2,this.height));
        this.addConnector(new tern.ShapeConnector(0,this.height/2));
        this.addConnector(new tern.ShapeConnector(this.width,this.height/2));
    }
    
    tern.RectangleShape.superClass.paint.call(this,context);
  },
});
    
})(window);