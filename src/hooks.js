import { useEffect, useState } from "react";

import shaders from "./shaders";
import { loadImageFromURL, initWebGL } from "./helpers";

export const useWebGL2DPanel = (canvasRef) => {
  const [webGL, setWebGL] = useState(null);
  const [imageURL, setImageURL] = useState(null);

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
  }, [canvasRef, imageURL]);

  const render = (mouseX, mouseY, drawing, erasing) => {
    if (!webGL) return;

    const { gl, helpers, shaders } = webGL;

    if (drawing) {
      helpers.renderStencilBuffer(() => {
        gl.useProgram(shaders.penShader.program);
        gl.uniform2f(
          shaders.penShader.uniforms[0],
          mouseX,
          canvasRef.current.height - mouseY
        );
        helpers.drawRectangle(shaders.penShader.attributes[0]);
      }, erasing);
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

  return { render, setImageURL };
};
