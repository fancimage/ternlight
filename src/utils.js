/**
 * TernLight: Javascript Library for draw flow-chart,Based on HTML5 CANVAS API.
 * 
 * @author fancimage
 * @Copyright 2013 fancimage@gmail.com Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
 
(function(){

var util = tern.namespace('util');

util.classdef('DashedLine',{ 
  DashedLine: function(dashArray,context){
    this.context = context;
	this.dashArray = dashArray || [10, 5];
    
    this.lastX = this.lastY = -1;
  },

  moveTo: function(x,y){
	this.lastX = x;
    this.lastY = y;  
    //this.context.moveTo(this.lastX,this.lastY);    
  },

  lineTo: function(x,y){
	var dashCount = this.dashArray.length;
    var dx = (x - this.lastX), dy = (y - this.lastY);
    if(0 == dx) var slope = 0;
    else var slope = dy / dx;
    var distRemaining = Math.sqrt(dx * dx + dy * dy);
    var dashIndex = 0, draw = true;
    
    this.context.moveTo(this.lastX,this.lastY);
    
    while (distRemaining >= 0.1) {
        var dashLength = this.dashArray[dashIndex++ % dashCount];
        if (dashLength > distRemaining) dashLength = distRemaining;
        var xStep = Math.sqrt(dashLength * dashLength / (1 + slope * slope));

        if(0 != dx){
            var signal = (x > this.lastX ? 1 : -1);
            this.lastX += xStep * signal;
            this.lastY += slope * xStep * signal;
        }else{
            var signal = (y > this.lastY ? 1 : -1);
            this.lastY += xStep * signal;
        }
        
        this.context[draw ? 'lineTo' : 'moveTo'](this.lastX, this.lastY);
        distRemaining -= dashLength;
        draw = !draw;
    }
    
    this.lastX = x;
    this.lastY = y;    
  },
});

})();