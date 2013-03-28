
(function(){

var terntest = namespace('terntest');
window.terntest = terntest;

var icon = new Image();   
icon.src="resource.png";
icon.onload = function(){
};

var _shapeWidth = 56;
var _shapeHeight = 60;
    
terntest.classdef('MyShape',tern.Shape,{
    MyShape: function(str,editable){
        tern.Shape.call(this);
        this.width = _shapeWidth;
        this.height = _shapeHeight;
        
        this.label = new tern.Text('myshape',true);
        
        this.label.height = 20;
        this.label.x = 0;    
        this.label.y = _shapeHeight-this.label.height;
        this.label.width = _shapeWidth;
        this.label.align = 'center';
        this.label.valign= 'middle';
        
        this.addChild(this.label);
    },
    
    paint: function(context) {
        var labelHeight = this.label.height;
        
        //connectors
        if(this.connectors.length <= 0){
            this.addConnector(new tern.ShapeConnector(_shapeWidth/2,0));
            this.addConnector(new tern.ShapeConnector(_shapeWidth/2,_shapeHeight-labelHeight));
            this.addConnector(new tern.ShapeConnector(0,(_shapeHeight-labelHeight)/2));
            this.addConnector(new tern.ShapeConnector(_shapeWidth,(_shapeHeight-labelHeight)/2));
        }
        
        //drawimage(32*32)
        var left = (_shapeWidth - 32)/2;
        var top = (_shapeHeight - labelHeight - 32)/2;
        context.drawImage(icon,left,top,32,32);
    
        tern.RectangleShape.superClass.paint.call(this,context);
    },
    
});
    
})();