import React from "react";

function Photo({
    src="",
    alt="Default Img"
}){
    return (
        <img className="default-photo" src={src} alt={alt} />
    );
}

export default Photo;