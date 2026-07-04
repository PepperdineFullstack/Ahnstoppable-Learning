import React from "react";
import studentPhotos from "../../assets/studentPhotos/studentPhotos";
import Photo from "./Photo";

function PhotoHeader(){
    const shuffledPhotos = [...studentPhotos].sort(() => (0.5 - Math.random()));
    const selectedPhotos = studentPhotos.slice(0, 9);
    return (
        <div className="grid grid-cols-3 gap-4 justify-center">
            {selectedPhotos.map((url, index) => (
                <Photo className="aspect-3/2 object-cover" key={index} src={url} alt={`Gallery ${index}`} />
            ))}
        </div>
    );
}

export default PhotoHeader