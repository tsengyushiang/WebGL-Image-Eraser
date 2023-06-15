import React, { useEffect, useRef, useState } from "react";

const shaders = {
  vertexShader: `
    attribute vec2 a_position;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_position.xy/2.0+0.5;
    }
  `,
  fragmentShader: `
    precision mediump float;
    uniform sampler2D u_texture;
    varying vec2 v_texCoord;
    void main() {
      gl_FragColor = texture2D(u_texture, v_texCoord);
    }
  `,
  penFragmentShader: `
    precision mediump float;
    uniform vec2 u_mouse;
    varying vec2 v_texCoord;
    void main() {
      float distance = distance(gl_FragCoord.xy, u_mouse);

      if (distance < 10.) {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      } else {
        discard;
      }
    }
  `,
};

const loadImageFromURL = (url) => {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = url;
    image.crossOrigin = "anonymous";
    image.onload = () => {
      resolve(image);
    };
  });
};

const initWebGL = (canvas) => {
  const gl = canvas.getContext("webgl", {
    stencil: true,
    preserveDrawingBuffer: true,
  });

  gl.enable(gl.STENCIL_TEST);
  gl.disable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

  if (!gl) {
    throw "WebGL is not supported";
  }

  const compileShader = (
    vertexShaderSource,
    fragmentShaderSource,
    attributes = [],
    uniforms = []
  ) => {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    // Check for vertex shader compilation errors
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error(
        "Vertex shader compilation error:",
        gl.getShaderInfoLog(vertexShader)
      );
      return;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    // Check for fragment shader compilation errors
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error(
        "Fragment shader compilation error:",
        gl.getShaderInfoLog(fragmentShader)
      );
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Check for program linking errors
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }

    return {
      program,
      attributes: attributes.map((key) => gl.getAttribLocation(program, key)),
      uniforms: uniforms.map((key) => gl.getUniformLocation(program, key)),
    };
  };

  const positionBuffer = gl.createBuffer();
  const positions = [-1, 1, -1, -1, 1, 1, 1, -1];
  const drawRectangle = (positionAttributeLocation) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const renderStencilBuffer = (render, revert) => {
    gl.stencilFunc(gl.ALWAYS, revert ? 0 : 1, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);

    render();

    gl.stencilFunc(gl.EQUAL, 0, 0xff);
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    gl.clear(gl.COLOR_BUFFER_BIT);
  };

  const bindTexture = (image, textureLocation) => {
    const texture = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(textureLocation, 0);
  };

  return {
    gl,
    helpers: {
      drawRectangle,
      compileShader,
      renderStencilBuffer,
      bindTexture,
    },
  };
};

const WebGL2DPanel = ({ imageURL }) => {
  const canvasRef = useRef(null);
  const [erasing, setErasing] = useState(false);
  const [keyDown, setKeyDown] = useState(false);
  const [webGL, setWebGL] = useState(null);

  useEffect(() => {
    try {
      const canvas = canvasRef.current;
      const { gl, helpers } = initWebGL(canvas);

      const textureShader = helpers.compileShader(
        shaders.vertexShader,
        shaders.fragmentShader,
        ["a_position"],
        ["u_texture"]
      );

      const penShader = helpers.compileShader(
        shaders.vertexShader,
        shaders.penFragmentShader,
        ["a_position"],
        ["u_mouse"]
      );

      loadImageFromURL(imageURL)
        .then((image) => {
          helpers.bindTexture(image, textureShader.uniforms[0]);
          canvas.width = image.width;
          canvas.height = image.height;
          gl.viewport(0, 0, canvas.width, canvas.height);
        })
        .then(() => {
          gl.useProgram(textureShader.program);
          helpers.drawRectangle(textureShader.attributes[0]);

          setWebGL({
            gl,
            helpers,
            shaders: {
              textureShader,
              penShader,
            },
          });
        });
    } catch (e) {
      console.error(e);
    }
  }, [imageURL]);

  const getPixelCoord = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    return [mouseX, mouseY];
  };

  const render = (mouseX, mouseY, erasing) => {
    if (!webGL) return;

    const { gl, helpers, shaders } = webGL;

    if (erasing) {
      helpers.renderStencilBuffer(() => {
        gl.useProgram(shaders.penShader.program);
        gl.uniform2f(
          shaders.penShader.uniforms[0],
          mouseX,
          canvasRef.current.height - mouseY
        );
        helpers.drawRectangle(shaders.penShader.attributes[0]);
      }, keyDown);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(shaders.textureShader.program);
    helpers.drawRectangle(shaders.textureShader.attributes[0]);

    gl.disable(gl.STENCIL_TEST);
    gl.useProgram(shaders.penShader.program);
    gl.uniform2f(
      shaders.penShader.uniforms[0],
      mouseX,
      canvasRef.current.height - mouseY
    );
    helpers.drawRectangle(shaders.penShader.attributes[0]);
    gl.enable(gl.STENCIL_TEST);
  };

  const onMouseDown = (event) => {
    setErasing(true);
    const [mouseX, mouseY] = getPixelCoord(event);
    render(mouseX, mouseY, true);
  };

  const onMouseMove = (event) => {
    const [mouseX, mouseY] = getPixelCoord(event);
    render(mouseX, mouseY, erasing);
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
