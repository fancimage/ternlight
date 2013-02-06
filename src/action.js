/**
 * TernLight: Javascript Library for draw flow-chart,Based on HTML5 CANVAS API.
 * 
 * @author fancimage
 * @Copyright 2013 fancimage@gmail.com Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
 
(function(){

var Actions = tern.namespace('Actions');
var Action = tern.Action;

Actions.classdef('MoveAction',tern.MouseAction,{
  MoveAction: function(){
    tern.MouseAction.call(this);
    this.initialX = 0;
    this.initialY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.fromX = 0;
    this.fromY = 0;
    
    this.pointDrager = null;
    this.findedCT = null;     
  },

  mousedown: function(e){
    if(this.state != Action.States.Unactive) return;
    
    var sels = this.diagram.getSelectedItems();
    if(sels!=null && sels.length > 0){
        this.initialX = this.lastX = e.mouseX;
        this.initialY = this.lastY = e.mouseY;
        this.activate();        
    }else if(this.diagram._getSelectedConnector() != null){
        var ct = this.diagram._getSelectedConnector();
        if(!(ct.parent instanceof tern.Connection)) return;
        
        this.initialX = this.lastX = ct.x;
        this.initialY = this.lastY = ct.y;
        this.pointDrager = ct.beginDrag();
        if (this.pointDrager == null){
            if (!ct.draggable) return;
        }else if (!this.pointDrager.movable()){
            this.pointDrager.cancel();
            this.pointDrager = null;
            return;
        }
        
        var children = ct.parent.connectors;
        var index = children.indexOf(ct);
        if(0 == index) index = 1;
        else index--;
        
        if (index >= 0 && index < children.length){
            this.fromX = children[index].x;
            this.fromY = children[index].y;
        }else{
            this.fromX = this.initialX;
            this.fromY = this.initialY;
        }
        this.activate();        
    }
  },

  mousemove: function(e){
    if(this.state != Action.States.Active) return;
    
    var offsetX = e.mouseX - this.lastX;
    var offsetY = e.mouseY - this.lastY;
    var selct = this.diagram._getSelectedConnector();
    if(selct == null){
        var sels = this.diagram.getSelectedItems();
        for(var i=0;i<sels.length;i++){
            sels[i].move(offsetX,offsetY);
        }
    }else{
        var oldFinded = this.findedCT;
        this.findedCT = null;
        
        if(selct.type == tern.ConnectorType.Endpoint){
            var ct = this.diagram.findConnectorAt(e.mouseX,e.mouseY,this.fromX,this.fromY);
            if(ct != null && ct.attachable){
                this.findedCT = ct;
                if (ct == oldFinded){
                    oldFinded = null;
                }else{
                    this.findedCT.stress(true);
                    this.findedCT.parent.stress(true);
                }
            }
        }
        
        if (oldFinded != null){
            oldFinded.stress(false);
            if (this.findedCT == null || this.findedCT.parent != oldFinded.parent){
                oldFinded.parent.stress(false);
            }
        }
        
        if (this.pointDrager != null){
            this.pointDrager.move(offsetX,offsetY);
        }else{
            selct.move(offsetX,offsetY);
        }
    }
    
    this.lastX = e.mouseX;
    this.lastY = e.mouseY;
  },

  mouseup: function(e){
    if(this.state != Action.States.Active) return;
    
    this.deActivate();
    if(this.initialX == this.lastX && this.initialY == this.lastY){
        if (this.pointDrager != null){
            this.pointDrager.cancel();
            this.pointDrager = null;
        }
        return;
    }
    
    var cmd = null;
    var selct = this.diagram._getSelectedConnector();
    if(selct == null){
        cmd = new tern.Commands.MoveCommand(this.diagram.getSelectedItems(), this.lastX - this.initialX, this.lastY - this.initialY);
    }else{
        if (this.findedCT == null && selct.type == tern.ConnectorType.Endpoint){
            this.findedCT = this.diagram.findConnectorAt(this.lastX,this.lastY,this.fromX,this.fromY);
        }
        
        var bindCmd = null;
        if (this.findedCT != null && this.findedCT.attachable){
            var findedPoint = this.findedCT.parent.pointToGlobal(this.findedCT.x,this.findedCT.y); //findedCT comes from shape.  MUST?
            var offsetX = findedPoint.x - this.lastX;
            var offsetY = findedPoint.y - this.lastY;
            if (this.pointDrager != null){
                this.pointDrager.move(offsetX,offsetY);
            }else{
                selct.move(offsetX,offsetY);
            }
            
            this.lastX = findedPoint.x;
            this.lastY = findedPoint.y;
            
            bindCmd = new tern.Commands.BindConnectorCommand(selct, this.findedCT, true);     //attached!!
            this.findedCT.stress(false);
            this.findedCT.parent.stress(false);
        }else{
            if(selct.attachTo!=null){
                bindCmd = new tern.Commands.BindConnectorCommand(selct, selct.attachTo, false);
            }
        }
        
        if (this.pointDrager != null){
            this.pointDrager.commit();
            this.pointDrager = null;
        }
        
        cmd = new tern.Commands.ConnectorMoveCommand(selct, this.lastX - this.initialX, this.lastY - this.initialY);
        if (bindCmd != null){
            var packageCmd = new tern.Commands.CompoundCommand();
            packageCmd.addCommand(cmd);

            bindCmd.redo();
            packageCmd.addCommand(bindCmd);

            cmd = packageCmd;
        }
    }
    
    if(cmd != null){
        this.diagram.undoManager.addCommand(cmd);
    }
  },
});

Actions.classdef('SectionAction',tern.MouseAction,{ 
  SectionAction: function(){
    tern.MouseAction.call(this);
    this.initialX = this.initialY = -1;
    this.ghost = null;
  },

  mousedown: function(e){
    if(this.state == Action.States.Unactive){
        this.initialX = e.mouseX;
        this.initialY = e.mouseY;   

        if(null == this.ghost){
            this.ghost = this.diagram.__ghost;
        }
        
        this.ghost.x = e.mouseX;
        this.ghost.y = e.mouseY;
        this.ghost.width = 0;
        this.ghost.height = 0;
        this.ghost.visible = true;        
        this.activate();
    }
  },

  mouseup: function(e){
    if(this.state == Action.States.Active){
        this.deActivate();
        if(this.initialX!=e.mouseX && this.initialY!=e.mouseY){
            this.diagram._setSelectedConnector( null );
            var rect = new tern.Rect(this.initialX,this.initialY,e.mouseX,e.mouseY);
            sels = this.diagram.findElementsIn(rect.x,rect.y,rect.width,rect.height);
            this.diagram.setSelectedItems( sels );
        }
        this.ghost.visible = false;
    }
  },
  
  mousemove: function(e){
    if(this.state == Action.States.Active){
        var context = this.diagram.context;
        var rect = new tern.Rect(this.initialX,this.initialY,e.mouseX,e.mouseY);
        this.ghost.x = rect.x;
        this.ghost.y = rect.y;
        this.ghost.width = rect.width;
        this.ghost.height = rect.height;
    }
  },
});

Actions.classdef('HitAction',tern.MouseAction, {
  HitAction: function(){
    tern.MouseAction.call(this);
  },

  mouseup: function(e){
    if(this.state == Action.States.Active){
        this.deActivate();
    }
  },
  
  mousedown: function(e){
    if(this.state == Action.States.Suspend) return;
    var item = this.diagram.findAt(e.mouseX,e.mouseY);
    if(item != null){
        if(item instanceof tern.DiagramItem){
            var sels = this.diagram.getSelectedItems();
            if(sels!=null && sels.indexOf(item)>=0 ) return;

            this.diagram._setSelectedConnector( null );
            this.diagram.setSelectedItems( item );
        }else{
            this.diagram.setSelectedItems( null );
            if(item instanceof tern.Connector){
                this.diagram._setSelectedConnector( item );
            }else{
                this.diagram._setSelectedConnector( null );
            }
        }
    }else{
        this.diagram.setSelectedItems( null );
        this.diagram._setSelectedConnector( null );
    }       
  },
});

Actions.classdef('HoverAction',tern.MouseAction,{
  HoverAction: function(){
    tern.MouseAction.call(this);
    this.current = null;
  },

  mousemove: function(e){
    if (this.state == Action.States.Suspend
        || this.state == Action.States.Disable){
        return;
    }
    
    var item = this.diagram.findAt(e.mouseX,e.mouseY);
    if(item!=this.current){
        if(this.current!=null) this.current.onHovered(false);
        this.current = item;
        if(this.current!=null) this.current.onHovered(true);
    }
  },
});

})();