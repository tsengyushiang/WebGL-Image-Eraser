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
  paintFragmentShader: `
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
  `
};

const initGL = (canvas) => {
  const gl = canvas.getContext("webgl", {
    stencil: true,
    preserveDrawingBuffer: true
  });
  gl.enable(gl.STENCIL_TEST);
  gl.disable(gl.DEPTH_TEST);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

  if (!gl) {
    throw "WebGL is not supported";
  }

  const compileShader = (vertexShaderSource, fragmentShaderSource) => {
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

    return program;
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

  const loadTexture = (imageURL, u_texture) => {
    return new Promise((resolve) => {
      const texture = gl.createTexture();
      const image = new Image();
      image.src = imageURL;
      image.crossOrigin = "anonymous";
      image.onload = () => {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image
        );
        gl.uniform1i(u_texture, 0);
        resolve();
      };
    });
  };

  return {
    gl,
    helpers: {
      drawRectangle,
      compileShader,
      renderStencilBuffer,
      loadTexture
    }
  };
};

const WebGLPannel = ({ imageURL }) => {
  const canvasRef = useRef(null);
  const [cleaning, setCleaning] = useState(false);
  const [keyDown, setKeyDown] = useState(false);
  const [webGL, setWebGL] = useState(null);

  useEffect(() => {
    try {
      const canvas = canvasRef.current;
      const { gl, helpers } = initGL(canvas);

      const imageProgram = helpers.compileShader(
        shaders.vertexShader,
        shaders.fragmentShader
      );

      const paintProgram = helpers.compileShader(
        shaders.vertexShader,
        shaders.paintFragmentShader
      );

      const imageQuad = gl.getAttribLocation(imageProgram, "a_position");

      const paintQuad = gl.getAttribLocation(imageProgram, "a_position");

      const u_texture = gl.getUniformLocation(imageProgram, "u_texture");

      helpers.loadTexture(imageURL, u_texture).then(() => {
        gl.useProgram(imageProgram);
        helpers.drawRectangle(imageQuad);

        setWebGL({
          gl,
          helpers,
          programs: {
            image: imageProgram,
            paint: paintProgram
          },
          attributes: {
            imageQuad,
            paintQuad
          }
        });
      });
    } catch (e) {
      console.error(e);
    }
  }, [imageURL]);

  const onMouseMove = (event) => {
    if (!webGL) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const { gl, helpers, programs, attributes } = webGL;

    if (cleaning) {
      console.log(keyDown);
      helpers.renderStencilBuffer(() => {
        gl.useProgram(programs.paint);
        const mouseLocation = gl.getUniformLocation(programs.paint, "u_mouse");
        gl.uniform2f(mouseLocation, mouseX, canvasRef.current.height - mouseY);
        helpers.drawRectangle(attributes.paintQuad);
      }, keyDown);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(programs.image);
    helpers.drawRectangle(attributes.imageQuad);

    gl.disable(gl.STENCIL_TEST);
    gl.useProgram(programs.paint);
    const mouseLocation = gl.getUniformLocation(programs.paint, "u_mouse");
    gl.uniform2f(mouseLocation, mouseX, canvasRef.current.height - mouseY);
    helpers.drawRectangle(attributes.paintQuad);
    gl.enable(gl.STENCIL_TEST);
  };

  return (
    <>
      <canvas
        tabIndex="1"
        ref={canvasRef}
        onMouseMove={onMouseMove}
        onMouseDown={() => setCleaning(true)}
        onMouseUp={() => setCleaning(false)}
        onKeyDown={() => setKeyDown(true)}
        onKeyUp={() => setKeyDown(false)}
      />
      <br />
      <span>{`Drag mouse (state: ${cleaning}) to eraser image`}</span>
      <br />
      <span>{`Press key (state: ${keyDown}) and Dragging mouse (state: ${cleaning}) to restore image`}</span>
    </>
  );
};

const App = () => {
  return (
    <WebGLPannel
      imageURL={
        "https://www.shutterstock.com/image-photo/happy-puppy-dog-smiling-on-260nw-1799966587.jpg"
      }
    />
  );
};

export default App;
