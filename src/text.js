
(function(){
    
tern.classdef('Text',tern.UIElement,{
    Text: function(str,editable){
        tern.UIElement.call(this);
        
        this.text = str;
        this.editable = editable|false;
        this.editing = false;
        this.width = null;
        this.height = null;
        this.fillStyle = 'black';
        this.font = null;
        this.align = null;
        this.valign = null;
        this._autoSize = 0;
        //this._textbox = null; /*input type="text": to edit text*/
    },
    
    edit: function(){  /*begin to edit...*/
        var diagram = this.getDiagram();
        if(!diagram) return;
        
        this.editing = true;
        //tern.Text.editing = true;
        
        var textbox = tern.Text._textbox;
        if(null == tern.Text._textbox){
            var textbox = document.createElement("input");
            textbox.type = "text";
            tern.Text._textbox = textbox;
            document.body.appendChild(textbox);
            
            textbox.onblur = function(){
                if(tern.Text.current){
                    tern.Text.current._unedit();
                }
            };
            var that = this;
            textbox.onchange = function(){
                diagram._events.trigger('onTextChange',that,this.value);
            };
        }       

        var point = this.pointToGlobal(0,0);
        var offset = diagram.offset();
        
        textbox.style.display = 'block';
        textbox.style.width = (this.width + 8) + 'px';
        textbox.style.height = (this.height + 4) + 'px';
        textbox.style.position  = 'absolute';
        textbox.style.left = (offset.x+point.x)+'px';
        textbox.style.top = (offset.y+point.y) + 'px';
        //tern.Text._textbox.style="display:block;width="+this.width+"px;height:"+this.height+"px;float:true";
        textbox.value = this.text;
        textbox.focus();
    },
    
    _unedit: function(){
        this.editing = false;
        this.text = tern.Text._textbox.value;
        tern.Text._textbox.style.display = 'none';
        tern.Text.current = null;
        tern.Text._currText = null;
        
        if(this._autoSize & 1 != 0) this.width = null;
        if(this._autoSize & 2 != 0) this.height = null;
    },
    
    paint: function(context) {
        if(!this.editing){
            if(!this.text || this.text == '') return;
            
            if(this.fillStyle!=null) context.fillStyle = this.fillStyle;
            if(this.font!=null) context.font=this.font;
            
            if(this.valign == null) context.textBaseline = 'top';  //alphabetic,top,hanging,middle,ideographic,bottom
            else context.textBaseline = this.valign;
            if(this.align != null) context.textAlign = this.align;   //left(start),right(end),center
            
            //auto size??
            var textWidth = context.measureText(this.text).width;
            if(null == this.width){
                this.width = textWidth;
                this._autoSize |= 1;
            }
            
            var textHeight = context.measureText('M').width * 2;
            if(null == this.height){
                //You can get a very close approximation of the vertical height by checking the length of a capital M.
                this.height = textHeight;
                this._autoSize |= 2;
            }
            
            var left = 0;
            if(context.textAlign == 'center') left = this.width/2;
            else if(context.textAlign == 'right') left = this.width;
            
            var top = 0;
            if(context.textBaseline == 'bottom') top = this.height;
            else if(context.textBaseline == 'middle') top = (this.height)/2;
            
            context.fillText(this.text,left,top,this.width);
        }
    },
    
});    

//tern.Text.editing = false;
tern.Text._textbox = null;

tern.Text.current = null;
tern.Text._currText = null;
tern.Text._lasttime = null;

tern.Text.onclick = function(item){
    if( tern.Text.current ){
        if(item == tern.Text.current) return;
        else{
            tern.Text.current._unedit();
        }
    } 
    if(item == tern.Text._currText){
        var now = (new Date()).getTime();
        if(now - tern.Text._lasttime < 2000){
            tern.Text.current = item;
            item.edit();
            return true;
        } else {
            tern.Text._lasttime = now;
        }
    }else{
        tern.Text._lasttime = (new Date()).getTime();
    }

    tern.Text._currText = item;//alert(item.text);

    return false;
}
    
})();