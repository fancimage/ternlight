/**
 * TernLight: Javascript Library for draw flow-chart,Based on HTML5 CANVAS API.
 * 
 * @author fancimage
 * @Copyright 2013 fancimage@gmail.com Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
 
(function(window){

/*
 * to declare a class
 */
var classdef = function(){
    var argv = arguments.length;
    if(argv <= 0) return null;
    
    var classname = arguments[0];
    if(!classname || !(typeof classname === 'string') ) return;
    if(this[classname]) throw Error(classname+' already defined!');
    
    var superClazz = null;
    var obj = null;
    if(2 == argv){
        if(typeof arguments[1] === 'function') superClazz = arguments[1];
        else obj = arguments[1]        
    }else if(argv > 2){
        superClazz = arguments[1];
        var obj = arguments[2];
    }
    
    if(obj){
        var cons = obj[classname];
        if(!cons || !(typeof cons === 'function')) var myclass = this[classname] = function(){};
        else var myclass = this[classname] = obj[classname];
    }else{
        var myclass = this[classname] = function(){};
    }
    
    if(superClazz){ /*extends superClass*/
        var superClass = function(){};
        myclass.superClass = superClass.prototype = superClazz.prototype;
        myclass.prototype = new superClass();
        myclass.prototype.constructor = myclass;
    }
    
    for(var i in obj){
        if(i == classname) continue;
        
        var member = obj[i];
        if(typeof member === 'function') myclass.prototype[i] = member;
        else myclass[i] =  member;
    }
    
    return myclass;
}

var namespace = function(name){
    if(name) {
        if(this[name]) throw Error(classname+' already defined!');
        var ns = function(){}
    }
    else var ns = function(){}
    
    ns.prototype.namespace = window.namespace;
    ns.prototype.classdef = classdef;
    this[name] = new ns();
    
    return this[name];
}
window.namespace = namespace;

/*
 * create namespace tern
 */
var tern = namespace('tern');

window.tern = tern;

tern.delegate = function(func, instance){
	var context = instance || window;
  	if (arguments.length > 2) {    	
        var leftArgs = Array.prototype.slice.call(arguments, 2);
    	return function() {
            var newArgs = Array.prototype.slice.call(arguments);
      		Array.prototype.unshift.apply(newArgs, leftArgs);
      		return func.apply(context, newArgs);
    	};
  	}else {
    	return function() { return func.apply(context, arguments); };
  	}
};

/*
 * Point class
 */
tern.Point = function(x, y)
{
	this.x = x;
	this.y = y;
}

/*
 * Rect class
 */
tern.Rect = function(x1,y1,x2,y2){
    this.x = x2>=x1?x1:x2;
    this.y = y2>=y1?y1:y2;
    this.width  = Math.abs(x2-x1);
    this.height = Math.abs(y2-y1);
}

/*
 * class: UIElement,can paint something in the canvas 
 */
tern.classdef('UIElement',{
    UIElement: function(){
        this.x = 0;
	    this.y = 0;
        this.visible = true;
        this.parent = null;
    },
    
    _onPaint: function(context,isLocal){
        if(!this.visible) return;
        
        context.save();
        if(!isLocal) context.translate(this.x, this.y);
        this.paint(context);
        context.restore();
    },
    
    paint: function(context){},  /*virtual*/
    
    pointToGlobal: function(x,y){
        var X = this.x + x;
        var Y = this.y + y;
        var p = this.parent;
        while(p != null){
            X += p.x;
            Y += p.y;
            p = p.parent;
        }
        return new tern.Point(X,Y);
    },
    
    pointToLocal: function(x,y){
        var X = x - this.x;
        var Y = y - this.y;
        var p = this.parent;
        while(p != null){
            X -= p.x;
            Y -= p.y;
            p = p.parent;
        }
        return new tern.Point(X,Y);
    },
    
    testInRect: function(x,y,width,height,isLocal){
        if(isLocal){
            x -= this.x;
            y -= this.y;
        }else{
            var p = pointToLocal(x,y);
            x = p.x;
            y = p.y;
        }
        
        return this._testInRect(x,y,width,height);
    },
    
    _testInRect: function(x,y,width,height){
        if(this.width > 0 && this.height > 0){  //Rectangle
            return x <= this.width && y <= this.height && x+width>=0 && y+height>=0;
        }
        
        //not Rectangle!!
        var context = tern.UIElement.__hitTestContext;
        if(this._easyHit && 1 == width && 1 == height){  //point hit test, make to select element easily
            context.canvas.width = context.canvas.height = width = height = 4;
            context.setTransform(1, 0, 0, 1, -x+2, -y+2);
        }else{
            context.canvas.width = width;
            context.canvas.height = height;
            context.setTransform(1, 0, 0, 1, -x, -y);
        }                       
        
        this._onPaint(context,true);
        try{
            var data = context.getImageData(0, 0, width, height).data;
            for(var j = 3;j < data.length;j += 4){
                if(data[j] > tern.UIElement.__hitTestTolerance) return true;
            }
        }catch(e){
        }
        
        context.canvas.width = 0;
        context.canvas.width = 1;
        return false;
    }
});

//internal-hidden canvas for elements(not rectangle) hit testing
var _canvas = document.createElement("canvas");
_canvas.width = _canvas.height = 1;
tern.UIElement.__hitTestContext = _canvas.getContext("2d");
tern.UIElement.__hitTestTolerance = 50;

/*
 * class: UIContainer,has child elements;
 */
tern.classdef('UIContainer', tern.UIElement, {
    UIContainer: function(){
        tern.UIElement.call(this);
        this.children = []; //child elements
    },
    
    paint: function(context){
        var count = this.children.length;
        for(var i = 0; i < count; i++){
            this.children[i]._onPaint(context);
        }
    },
    
    findElementsIn: function(x,y,width,height,handler){
        if(handler) var ret = false;
        else var ret = [];
        
        x -= this.x;
        y -= this.y;
        
        for(var i = this.children.length-1; i >= 0; i--){
            var child = this.children[i];
            if(child == null || !child.visible) continue;
            
            if((child instanceof tern.UIContainer) && child.children.length > 0){
                var objs = child.findElementsIn(x,y,width,height,handler);
                if(objs){
                    if(handler){
                        ret = true;
                    }else{
                        ret = ret.concat(objs);
                    }
                    continue;
                }                
            }
            
            if(child.testInRect(x,y,width,height,true)){
                if(handler){                    
                    if(!handler(child)) return true;
                    ret = true;
                }else{
                    ret.push(child);
                }
            }
        }
        
        return ret;
    },
    
    insertChild: function(index,child){        
        if(this.children.indexOf(child) >= 0) return child;
        if(child.parent) child.parent.removeChild(child);
        
        child.parent = this;
        if(index<0 || index >= this.children.length) this.children.push(child);
        else this.children.splice(index, 0, child);
        
        return child;
    },
    
    addChild: function(child){ return this.insertChild(-1,child);},
    
    removeChild: function(child){
        var index = this.children.indexOf(child);
        if (index < 0 || index > this.children.length - 1) return false;
        
        this.children[index].parent = null;
        this.children.splice(index, 1);
        return true;
    },
    
    removeAllChildren: function(){
        for(var i=this.children.length-1;i>=0;i--){
            this.children[i].parent = null;
        }
        this.children.splice(0);
    }
});

})(window);