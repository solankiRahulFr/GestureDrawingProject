import "./App.css";
import * as mp from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";
import { Button, Tooltip, Space, Popover } from "antd";
import { MdOutlineDraw, MdStopCircle } from "react-icons/md";
import { InfoOutlined } from "@ant-design/icons";
import {
  PiWebcamFill,
  PiWebcamSlashFill,
  PiEyeFill,
  PiEyeSlashFill,
} from "react-icons/pi";
import { simplifyLineRDP, smoothLine } from "./smooth";
import ColorPicker from "./ColorPicker";
import IntegerSlider from "./IntegerSlider";
import DecimalSlider from "./DecimalSlider";
import drawHand from "./Images/drawHand.png";
import eraseHand from "./Images/eraserHand.png";
let stream;
let handLandmarker = undefined;

function App() {
  const [webcamRunning, setwebcamRunning] = useState(false);
  const [enableCamButton, setEnableCamButton] = useState("Enable Webcam");
  const [viewCamButton, setViewCamButton] = useState("Hide Webcam");
  const [drawingButton, setDrawingButton] = useState("Start Drawing");
  const [tracking, setTracking] = useState(false);
  const webcamRef = useRef(null);
  const requestId = useRef(null);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);
  const [position, setPosition] = useState({
    x: 10,
    y: window.innerHeight - (window.innerHeight - 265),
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // const [colorLine, setColorLine] = useState("#F17013");
  const [lineSize, setLineSize] = useState(5);
  // const [roughness, setRoughness] = useState(1);
  // const [smoothness, setSmoothness] = useState(0.5);
  let liveSmooth,
    currentLine = [];
  let line = { lengthMin: 0, angle: 0.5, match: true };
  let size,
    color = { hex: "#F17013" },
    eraserSize=50;

// ------------------------------------------------USEEFFECT ON COMPONENT MOUNT AND CREATING S KEY LOGIC FOR START/STOP DRAWING----------------------------------------

useEffect(() => {
  canvasRef.current.width = window.innerWidth - 5;
  canvasRef.current.height = window.innerHeight - 5;
  handleColor("#F17013");
  onBrushSizeChange(5);
  onSmoothnessChange(0.5);
  onRoughnessChange(1);
}, []);

useEffect(() => {
  const handleKeyPress = (event) => {
    // Add your logic based on the pressed key
    if (event.key === "s" || event.key === "S") {
      if (webcamRunning) {
        if (tracking) {
          stopTracking();
        } else {
          startTracking();
        }
      }
    }
  };
  document.addEventListener("keydown", handleKeyPress);
  return () => {
    document.removeEventListener("keydown", handleKeyPress);
  };
}, [webcamRunning, tracking]);
// ------------------------------------------------END == USEEFFECT ON COMPONENT MOUNT AND CREATING S KEY LOGIC FOR START/STOP DRAWING----------------------------------------


// ------------------------------------------------DRAG AND DROP FOR WEBCAM WINDOW----------------------------------------
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: window.innerWidth - e.clientX - position.x,
      y: window.innerHeight - e.clientY - position.y,
    });
  };

  const handleMouseMove = (e) => {
    e.preventDefault();
    if (!isDragging) return;
    if (webcamRunning) {
      setPosition({
        x: Math.min(
          Math.max(window.innerWidth - e.clientX - dragStart.x, 0),
          window.innerWidth - webcamRef.current.clientWidth - 5
        ),
        y: Math.min(
          Math.max(window.innerHeight - e.clientY - dragStart.y, 0),
          window.innerHeight - webcamRef.current.clientHeight - 5
        ),
      });
    }
    console.log(webcamRef.current.clientWidth, webcamRef.current.clientHeight);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };
// ------------------------------------------------END == DRAG AND DROP FOR WEBCAM WINDOW----------------------------------------


// ------------------------------------------------FUNCTION TO CREATE MEDIAPIPE OBJECT FOR HANDTRACKING----------------------------------------
const createHandLandmarker = async () => {
  const vision = await mp.FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await mp.HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "CPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.8,
  });
};
// ------------------------------------------------END == FUNCTION TO CREATE MEDIAPIPE OBJECT FOR HANDTRACKING----------------------------------------


// ------------------------------------------------FUNCTION TO START WEBCAM----------------------------------------
  const enableCam = async () => {
    // calling mediapipe API handtracking AFTER CAMERA START
    createHandLandmarker();
    if (webcamRunning) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      webcamRef.current.srcObject = null;
      setwebcamRunning(false);
      setEnableCamButton("Enable Webcam");
    } else {
      setwebcamRunning(true);
      setEnableCamButton("Disable Webcam");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamRef.current.srcObject = stream;
        webcamRef.current.style.transform = "scaleX(-1)";
        webcamRef.current.style.width = "15rem";
        webcamRef.current.style.borderRadius = "0.5rem";
        webcamRef.current.play();
      } catch (err) {
        if (err.name === "NotAllowedError" || err.name === "SecurityError") {
          alert("Permission denied. Please allow access to the webcam.");
        } else {
          alert("Error accessing the webcam: " + err.message);
        }
      }
    }
  };
// ------------------------------------------------End == FUNCTION TO START WEBCAM----------------------------------------

// ------------------------------------------------FUNCTION HIDE AND SHOW WEBCAM----------------------------------------
  const viewHideCam = () => {
    if (webcamRunning) {
      if (webcamRef.current.style.display === "none") {
        setViewCamButton("Hide Webcam");
        webcamRef.current.style.display = "block";
      } else {
        setViewCamButton("Show Webcam");
        webcamRef.current.style.display = "none";
      }
    }
  };
// ------------------------------------------------FUNCTION HIDE AND SHOW WEBCAM----------------------------------------

  function ecluDistance2D(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
// FUNCTION TO CALCULATE ECLUDIAN DISTANCE BETWEEN 3D POINTS
  function calculateDistance3D(x1, y1, z1, x2, y2, z2) {
    return Math.sqrt(
      Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) + Math.pow(z2 - z1, 2)
    );
  }

// ------------------------------------------------FUNCTION TO DRAW ON CANVAS----------------------------------------
  function draw(ctx, x, y) {
    currentLine.push([x, y]);
    liveSmooth = smoothLine(
      simplifyLineRDP(currentLine, line.lengthMin),
      line.angle,
      line.match
    );
    ctx.beginPath();
    if (liveSmooth.length) {
      for (let i = 0; i < liveSmooth.length - 1; i++) {
        if (liveSmooth[i].length === 2) {
          // linear
          ctx.lineTo(liveSmooth[i][0], liveSmooth[i][1]);
        } else if (liveSmooth[i].length === 4) {
          // bezier 2nd order
          ctx.quadraticCurveTo(liveSmooth[i][2], liveSmooth[i][3], liveSmooth[i + 1][0], liveSmooth[i + 1][1]);
        } else {
          // bezier 3rd order
          ctx.bezierCurveTo(liveSmooth[i][2], liveSmooth[i][3], liveSmooth[i][4], liveSmooth[i][5], liveSmooth[i + 1][0], liveSmooth[i + 1][1]);
        }
      }
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  }
// ------------------------------------------------END == FUNCTION TO DRAW ON CANVAS----------------------------------------

// ------------------------------------------------FUNCTION TO CREATE LOGIC FOR HAND POSE ESTIMATION FOR SPECIFIC POSE----------------------------------------
  const checkingHandPose = (landMarks) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = color.hex;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const movingDiv = document.getElementById("cursorFake");
    let rect = canvasRef.current.getBoundingClientRect();
    if (
      calculateDistance3D(
        landMarks[0][4].x,
        landMarks[0][4].y,
        landMarks[0][4].z,
        landMarks[0][8].x,
        landMarks[0][8].y,
        landMarks[0][8].z
      ) < 0.04 &&
      calculateDistance3D(
        landMarks[0][4].x,
        landMarks[0][4].y,
        landMarks[0][4].z,
        landMarks[0][12].x,
        landMarks[0][12].y,
        landMarks[0][12].z
      ) < 0.04 &&
      calculateDistance3D(
        landMarks[0][8].x,
        landMarks[0][8].y,
        landMarks[0][8].z,
        landMarks[0][12].x,
        landMarks[0][12].y,
        landMarks[0][12].z
      ) < 0.04
    ) {
      movingDiv.style.display = "none";
      draw(
        ctx,
        canvasRef.current.width - landMarks[0][8].x * canvasRef.current.width,
        landMarks[0][8].y * canvasRef.current.height
      );
    } else {
      movingDiv.style.display = "inline";
      movingDiv.style.left = canvasRef.current.width - landMarks[0][8].x * canvasRef.current.width-5 + "px";
      movingDiv.style.top = landMarks[0][8].y * canvasRef.current.height-5 + "px";
      currentLine = [];
      if (
        landMarks[0][8].y < landMarks[0][6].y &&
        landMarks[0][12].y < landMarks[0][10].y &&
        landMarks[0][16].y < landMarks[0][14].y &&
        landMarks[0][20].y < landMarks[0][18].y && ecluDistance2D(landMarks[0][4].x,landMarks[0][4].y,landMarks[0][8].x,landMarks[0][8].y) >0.12
      ) {
        let xEra =
          canvasRef.current.width -
          landMarks[0][8].x * canvasRef.current.width -
          rect.left;
        let yEra = landMarks[0][8].y * canvasRef.current.height - rect.top;

        ctx.clearRect(
          xEra - ctx.lineWidth,
          yEra - ctx.lineWidth,
          eraserSize,
          eraserSize
        );

      }
    }
  };
// ------------------------------------------------END == FUNCTION TO CREATE LOGIC FOR HAND POSE ESTIMATION FOR SPECIFIC POSE----------------------------------------


// ------------------------------------------------FUNCTION FOR PASSING VIDEO FRAME TO MEDIAPIPE OBJECT TO TRACK POSE---------------------------------------
  let lastVideoTime = -1;
  let results = undefined;

  const predictWebcam = () => {
    if (lastVideoTime !== webcamRef.current.currentTime) {
      lastVideoTime = webcamRef.current.currentTime;
      results = handLandmarker.detectForVideo(
        webcamRef.current,
        performance.now()
      );
    }
    if (results.landmarks.length !== 0) {
      checkingHandPose(results.landmarks);
    }
    // Call this function again to keep predicting when the browser is ready.
    // requestId.current =requestAnimationFrame(predictWebcam);
  };
// ------------------------------------------------END == FUNCTION FOR PASSING VIDEO FRAME TO MEDIAPIPE OBJECT TO TRACK POSE---------------------------------------

// ------------------------------------------------FUNCTION CONTINOUSLY START TRACKING---------------------------------------
  const startTracking = () => {
    console.log("startTracking");
    setTracking(true);
    intervalRef.current = setInterval(() => {
      requestId.current = requestAnimationFrame(predictWebcam);
    }, 1000 / 20);
    setDrawingButton("Stop Drawing");
  };

// ------------------------------------------------FUNCTION STOP TRACKING---------------------------------------
  const stopTracking = () => {
    console.log("stopTracking");

    setTracking(false);
    setDrawingButton("Start Drawing");
    cancelAnimationFrame(requestId.current);
    clearInterval(intervalRef.current);
  };
// ------------------------------------------------END TRACKING---------------------------------------

// ------------------------------------------------FUNCTIONS TO HANDLE INPUT PARAMETERS---------------------------------------
  const handleColor = (clr) => {
    color.hex = clr.hex;
  };
  const onBrushSizeChange = (value) => {
    size = value;
    setLineSize(value);
  };
  const onSmoothnessChange = (value) => {
    line.angle = value;
  };
  const onRoughnessChange = (value) => {
    line.lengthMin = value;
  };
  const onEraserChange = (value) => {
    eraserSize = value;
  };
  const onEraserAll = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  };
// ------------------------------------------------END==FUNCTIONS TO HANDLE INPUT PARAMETERS---------------------------------------

// ------------------------------------------------FUNCTIONS EXPORT THE CANVAS---------------------------------------
  const handleDownload = (format) => {
    const link = document.createElement("a");
    let dataURL;
    if (format === "png") {
      dataURL = canvasRef.current.toDataURL("image/png");
      link.href = dataURL;
      link.download = "canvas_image.png";
    } else {
      dataURL = canvasRef.current.toDataURL("image/jpeg", 0.8);
      link.href = dataURL;
      link.download = "canvas_image.png";
    }
    const event = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
    });

    link.dispatchEvent(event);
  };
// ------------------------------------------------END == FUNCTIONS EXPORT THE CANVAS---------------------------------------

  const content = (
    <div className="infoContent">
      <p>
        <img src={drawHand} alt="Hand pose to draw"></img>
        <span>Draw with your index finger, middle finger and thumb close</span>
      </p>
      <p>
        <img src={eraseHand} alt="Hand pose to erase"></img>
        <span>Erase with the staight hand</span>
      </p>
    </div>
  );
  const contentDownload = (
    <div className="infoContent">
      <Button type="link" onClick={() => handleDownload("png")}>
        As PNG without BG
      </Button>
      <Button type="link" onClick={()=>handleDownload('jpg')} disabled>As JPG</Button>
    </div>
  );

  return (
    <div className="mainContainer">
      <div className="customButtons">
        <Space direction="vertical" style={{ width: "100%", rowGap: "1px" }}>
          <Space
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <ColorPicker onColorchange={handleColor} disabled={tracking}/>
            {/* <Button type="dashed" size="small" onClick={handleDownload}></Button> */}
            <Popover
              content={contentDownload}
              title="Download as"
              placement="bottomRight"
            >
              <Button type="dashed" size="small" disabled={tracking}>
                Save Drawing
              </Button>
            </Popover>
          </Space>
          <IntegerSlider
            disabled={tracking}
            onBrushSizeChange={onBrushSizeChange}
            name={"Brush"}
            intialValue={5}
          />
          <IntegerSlider
          disabled={tracking}
            onRoughnessChange={onRoughnessChange}
            name={"Brush roughness"}
            intialValue={1}
          />
          <DecimalSlider
          disabled={tracking}
            onSmoothnessChange={onSmoothnessChange}
            initialValue={0.5}
          />
          <div className="eraseAll">
          <IntegerSlider
          disabled={tracking}
            onEraserChange={onEraserChange}
            name={"Eraser Sizes"}
            intialValue={50}/>
          <Button type="dashed" size="small" onClick={onEraserAll}>Erase all</Button>
          </div>
          <div
            className={`${webcamRunning ? "controlButtons" : "controlOff"} ${
              viewCamButton === "Hide Webcam" ? "" : "webcamViewOff"
            }`}
          >
            {webcamRunning && (
              <Tooltip title={drawingButton} placement="bottomLeft">
                <Button
                  size="large"
                  shape="circle"
                  type="primary"
                  id="drawingButton"
                  onClick={tracking ? stopTracking : startTracking}
                  danger={tracking ? true : false}
                >
                  {tracking ? (
                    <MdStopCircle size={25} />
                  ) : (
                    <MdOutlineDraw size={25} />
                  )}
                </Button>
              </Tooltip>
            )}
            <Tooltip title={enableCamButton} placement="bottom">
              <Button
                size="large"
                style={{ marginLeft: "5px", marginRight: "5px" }}
                shape="circle"
                type="primary"
                id="webcamButton"
                onClick={enableCam}
                danger={webcamRunning ? true : false}
              >
                {webcamRunning ? (
                  <PiWebcamSlashFill size={25} />
                ) : (
                  <PiWebcamFill size={25} />
                )}
              </Button>
            </Tooltip>
            {webcamRunning && (
              <Tooltip title={viewCamButton} placement="bottomRight">
                <Button
                  size="large"
                  shape="circle"
                  type="primary"
                  id="webcamViewButton"
                  onClick={viewHideCam}
                  danger={viewCamButton === "Hide Webcam" ? true : false}
                >
                  {viewCamButton === "Hide Webcam" ? (
                    <PiEyeSlashFill size={25} />
                  ) : (
                    <PiEyeFill size={25} />
                  )}
                </Button>
              </Tooltip>
            )}
            <Popover
              content={content}
              title="Press key 'S' to start/stop drawing"
              placement="bottomRight"
              className="info"
            >
              <Button
                type="dashed"
                shape="circle"
                icon={<InfoOutlined />}
                size="large"
              ></Button>
            </Popover>
          </div>
        </Space>
      </div>
      {webcamRunning && (
        <video
          id="webcam"
          autoPlay
          playsInline
          ref={webcamRef}
          className="webcamControl"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            bottom: position.y,
            right: position.x,
            height: "180px",
            borderRadius: "4px",
          }}
        ></video>
      )}
      {tracking && (
        <span
          className="circleCursor"
          id="cursorFake"
          style={{ border: `${(lineSize/2).toFixed(2)}px solid ${color.hex}` }}
        ></span>
      )}
      <canvas
        className="output_canvas"
        id="output_canvas"
        ref={canvasRef}
      ></canvas>
    </div>
  );
}

export default App;
