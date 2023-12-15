import React, { useState }  from 'react'
import {Slider, Typography  } from 'antd';
const { Text } = Typography;
const DecimalSlider = (props) => {
    const [inputValue, setInputValue] = useState(0);
    const onChange = (value) => {
      if (isNaN(value)) {
        return;
      }
      setInputValue(value);
      console.log(props.disabled)
    };
    return (
        <div style={{width:"100%"}}><Text type="secondary">Smoothness</Text>       
          <Slider
          disabled={props.disabled}
          defaultValue={0.5}
            min={0}
            max={1}
            onChange={onChange}
            step={0.01}
          />
      </div>
    );
  };

  export default DecimalSlider;