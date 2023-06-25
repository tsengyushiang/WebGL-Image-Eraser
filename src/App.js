import React, { useEffect, useRef, useState } from "react";

import { getPixelCoord } from "./helpers";
import { useWebGL2DPanel } from "./hooks";

const WebGL2DPanel = ({ imageURL }) => {
  const canvasRef = useRef(null);
  const { render, setImageURL } = useWebGL2DPanel(canvasRef);
  const [erasing, setErasing] = useState(false);
  const [keyDown, setKeyDown] = useState(false);

  useEffect(() => {
    setImageURL(imageURL);
  }, [imageURL, setImageURL]);

  const onMouseDown = (event) => {
    setErasing(true);
    const [mouseX, mouseY] = getPixelCoord(event, canvasRef.current);
    render(mouseX, mouseY, true, keyDown);
  };

  const onMouseMove = (event) => {
    const [mouseX, mouseY] = getPixelCoord(event, canvasRef.current);
    render(mouseX, mouseY, erasing, keyDown);
  };

  return (
    <>
      <canvas
        tabIndex="1"
        ref={canvasRef}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={() => setErasing(false)}
        onKeyDown={() => setKeyDown(true)}
        onKeyUp={() => setKeyDown(false)}
      />
      <br />
      <span>{`Drag mouse (state: ${erasing}) to eraser image`}</span>
      <br />
      <span>{`Press key (state: ${keyDown}) and Dragging mouse (state: ${erasing}) to restore image`}</span>
    </>
  );
};

const App = () => {
  return <WebGL2DPanel imageURL={"/image.jpg"} />;
};

export default App;
