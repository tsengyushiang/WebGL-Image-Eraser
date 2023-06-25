import React, { useEffect, useRef, useState } from "react";

import { getPixelCoord } from "./helpers";
import { useWebGL2DPanel } from "./hooks";

const WebGL2DPanel = ({ imageURL }) => {
  const canvasRef = useRef(null);
  const { updateMask, setImageURL, renderCursor } = useWebGL2DPanel(canvasRef);
  const [dragging, setDragging] = useState(false);
  const [keyDown, setKeyDown] = useState(false);
  const [prevPoint, setPrevPoint] = useState(null);
  const [width, setWidth] = useState(10);

  useEffect(() => {
    setImageURL(imageURL);
  }, [imageURL, setImageURL]);

  const onMouseDown = (event) => {
    setDragging(true);
    const [mouseX, mouseY] = getPixelCoord(event, canvasRef.current);
    updateMask([[mouseX, mouseY]], width, keyDown);
    setPrevPoint([mouseX, mouseY]);
  };

  const onMouseMove = (event) => {
    const [mouseX, mouseY] = getPixelCoord(event, canvasRef.current);
    if (dragging) {
      if (prevPoint) updateMask([prevPoint, [mouseX, mouseY]], width, keyDown);
      setPrevPoint([mouseX, mouseY]);
    }
    renderCursor(mouseX, mouseY, width);
  };

  return (
    <>
      <canvas
        tabIndex="1"
        ref={canvasRef}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseLeave={() => setPrevPoint(null)}
        onMouseUp={() => setDragging(false)}
        onKeyDown={() => setKeyDown(true)}
        onKeyUp={() => setKeyDown(false)}
      />
      <br />
      <span>{`Eraser width: `}</span>
      <input
        type="range"
        min={10}
        max={100}
        onChange={(e) => setWidth(e.target.value)}
      />
      <br />
      <span>{`Drag mouse (state: ${dragging}) to eraser image`}</span>
      <br />
      <span>{`Press key (state: ${keyDown}) and Dragging mouse (state: ${dragging}) to restore image`}</span>
    </>
  );
};

const App = () => {
  return <WebGL2DPanel imageURL={"/image.jpg"} />;
};

export default App;
