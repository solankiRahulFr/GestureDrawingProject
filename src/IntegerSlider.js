import React, { useState }  from 'react'
import {Slider, Typography  } from 'antd';
const { Text } = Typography;
const IntegerSlider = (props) => {
    const onChange = (newValue) => {
      if(props.name==="Brush"){props.onBrushSizeChange(newValue)}
      if(props.name==="Eraser Sizes"){props.onEraserChange(newValue)}
      if(props.name==="Brush roughness"){props.onRoughnessChange(newValue)}
    };
    return (
        <div style={{width:"100%"}}>
        <Text type="secondary">{props.name}</Text>
          <Slider
          disabled={props.disabled}
            defaultValue={props.intialValue}
            min={1}
            max={100}
            onChange={onChange} 
          />
          </div>
    );
  };

  export default IntegerSlider