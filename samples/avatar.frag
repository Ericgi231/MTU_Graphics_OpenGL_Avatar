#version 150 // GLSL 150 = OpenGL 3.2

out vec4 fragColor;
in vec2 out_TexCoord; // Vertex texture coordinate
in vec3 out_Color;    // Vertex color
in vec3 out_Normal;   // Normal vector
in mat3 out_NormalMat;   // Normal matrix
in vec3 out_Position_CC; // Position of fragment in camera coordinates
in vec3 out_Tangent;
in vec3 out_Bitangent;

uniform int HasTex;    // Is there a texture in tex?
uniform sampler2D tex; // Diffuse texture
uniform sampler2D tex_NORMALS; // Texture normals
uniform sampler2D tex_SPECULAR; // Texture specular
uniform int renderStyle;

/** Calculate diffuse shading. Normal and light direction do not need
 * to be normalized. */
float diffuseScalar(vec3 normal, vec3 lightDir, bool frontBackSame)
{
	/* Basic equation for diffuse shading */
	float diffuse = dot(normalize(lightDir), normalize(normal));

	/* The diffuse value will be negative if the normal is pointing in
	 * the opposite direction of the light. Set diffuse to 0 in this
	 * case. Alternatively, we could take the absolute value to light
	 * the front and back the same way. Either way, diffuse should now
	 * be a value from 0 to 1. */
	if(frontBackSame)
		diffuse = abs(diffuse);
	else
		diffuse = clamp(diffuse, 0, 1);

	/* Keep diffuse value in range from .5 to 1 to prevent any object
	 * from appearing too dark. Not technically part of diffuse
	 * shading---however, you may like the appearance of this. */
	diffuse = diffuse/2 + .5;

	return diffuse;
}

float specular(vec3 normal, vec3 lightDir, vec3 camDir){
	vec3 newVec = normalize(lightDir) + normalize(camDir);
	return pow(abs(dot(normalize(newVec), normalize(normal))), 10);
}

void main() 
{
	/* Get position of light in camera coordinates. When we do
	 * headlight style rendering, the light will be at the position of
	 * the camera! */
	vec3 lightPos = vec3(0,1000,0);

	/* Calculate a vector pointing from our current position (in
	 * camera coordinates) to the light position. */
	vec3 lightDir = lightPos - out_Position_CC;

	// original normal and normal matrix
	vec3 originalNormal    = out_Normal;
	mat3 originalNormalMat = out_NormalMat;
	vec3 originalNormal_CC = normalize(originalNormalMat * originalNormal);

	// TBN matrix
	mat3 tbn;
	tbn[0] = out_Tangent;
	tbn[1] = out_Bitangent;
	tbn[2] = originalNormal;

	// texture normals
	vec3 texNormal = texture(tex_NORMALS, out_TexCoord).rgb;
	texNormal[0] = pow(texNormal[0], 1/2.2) * 2 - 1;
	texNormal[1] = pow(texNormal[1], 1/2.2) * 2 - 1;
	texNormal[2] = pow(texNormal[2], 1/2.2) * 2 - 1;

	// normals in camera coordinates
	vec3 adjustedNormal_CC = normalize(originalNormalMat * tbn * texNormal);

	/* Calculate diffuse shading */
	float originalDiffuse = diffuseScalar(originalNormal_CC, lightDir, false);
	float adjustedDiffuse = diffuseScalar(adjustedNormal_CC, lightDir, false);

	float specularVal = pow(texture(tex_SPECULAR, out_TexCoord).r, 1.0/2.2);
	float adjustedSpecular = specularVal * specular(adjustedNormal_CC, lightDir, -out_Position_CC);

	if(renderStyle == 0)
	{
		/* diffuse shading (no color) */
		fragColor = vec4(originalDiffuse, originalDiffuse, originalDiffuse, 1);
	}
	else if(renderStyle == 1)
	{
		/* diffuse shading with normalmap (no color) */
		fragColor = vec4(adjustedDiffuse, adjustedDiffuse, adjustedDiffuse, 1);

	}
	else if(renderStyle == 2)
	{
		/* display normals as a color */
		fragColor.xyz = (originalNormal_CC + 1)/2;
		fragColor.a = 1;
	}
	else if(renderStyle == 3)
	{
		/* display normals as a color (with normals updated by normal map) */
		fragColor.xyz = (adjustedNormal_CC + 1)/2;
		fragColor.a = 1;
	}
	else if(renderStyle == 4)
	{
		/* diffuse/color texture with diffuse shading using original normal. */
		if(bool(HasTex))
			fragColor = texture(tex, out_TexCoord);
		else
			fragColor = vec4(out_Color, 1);
		// include diffuse
		fragColor.xyz = fragColor.xyz * originalDiffuse;
	}
	else if(renderStyle == 5)
	{
		/* diffuse/color texture with diffuse shading using normalmap normal. */
		if(bool(HasTex))
			fragColor = texture(tex, out_TexCoord);
		else
			fragColor = vec4(out_Color, 1);
		// include diffuse
		fragColor.xyz = fragColor.xyz * adjustedDiffuse;
	}
	else if(renderStyle == 6)
	{
		/* diffuse/color texture, diffuse shading with normalmap, specular shading */
		if(bool(HasTex))
			fragColor = texture(tex, out_TexCoord);
		else
			fragColor = vec4(out_Color, 1);
		// include diffuse
		fragColor.xyz = fragColor.xyz * adjustedDiffuse;
		// add specular
		fragColor.xyz = fragColor.xyz + (adjustedSpecular * vec3(1,1,1));
	}
}
