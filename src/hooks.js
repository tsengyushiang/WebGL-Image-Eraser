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
        ["u_mouse", "u_width"]
      );

      const lineShader = helpers.compileShader(
        shaders.vertexShader,
        shaders.lineFragmentShader,
        ["a_position"],
        ["u_startPoint", "u_endPoint", "u_width"]
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
              lineShader,
            },
          });
        });
    } catch (e) {
      console.error(e);
    }
  }, [canvasRef, imageURL]);

  const renderBackgroundImage = ({ gl, helpers, shaders }) => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(shaders.textureShader.program);
    helpers.drawRectangle(shaders.textureShader.attributes[0]);
  };

  const renderCursor = (mouseX, mouseY, width) => {
    if (!webGL) return;

    const { gl, helpers, shaders } = webGL;

    renderBackgroundImage({ gl, helpers, shaders });

    gl.disable(gl.STENCIL_TEST);
    gl.useProgram(shaders.penShader.program);
    gl.uniform2f(shaders.penShader.uniforms[0], mouseX, mouseY);
    gl.uniform1f(shaders.penShader.uniforms[1], width);
    helpers.drawRectangle(shaders.penShader.attributes[0]);
    gl.enable(gl.STENCIL_TEST);
  };

  const updateMask = (points, width, erasing) => {
    if (!webGL) return;

    const { gl, helpers, shaders } = webGL;

    helpers.renderStencilBuffer(() => {
      for (let i = 0; i < points.length; i++) {
        if (i + 1 >= points.length) {
          const [mouseX, mouseY] = points[i];
          gl.useProgram(shaders.penShader.program);
          gl.uniform2f(shaders.penShader.uniforms[0], mouseX, mouseY);
          gl.uniform1f(shaders.penShader.uniforms[1], width);
          helpers.drawRectangle(shaders.penShader.attributes[0]);
        } else {
          const [mouseX0, mouseY0] = points[i];
          const [mouseX1, mouseY1] = points[i + 1];
          gl.useProgram(shaders.lineShader.program);
          gl.uniform2f(shaders.lineShader.uniforms[0], mouseX0, mouseY0);
          gl.uniform2f(shaders.lineShader.uniforms[1], mouseX1, mouseY1);
          gl.uniform1f(shaders.lineShader.uniforms[2], width);
          helpers.drawRectangle(shaders.lineShader.attributes[0]);
        }
      }
    }, erasing);

    renderBackgroundImage({ gl, helpers, shaders });
  };

  return { updateMask, setImageURL, renderCursor };
};
