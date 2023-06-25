export const loadImageFromURL = (url) => {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = url;
    image.crossOrigin = "anonymous";
    image.onload = () => {
      resolve(image);
    };
  });
};

export const getPixelCoord = (event, element) => {
  const rect = element.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  return [mouseX, mouseY];
};

export const initWebGL = (canvas) => {
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
