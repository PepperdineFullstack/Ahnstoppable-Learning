

const images = import.meta.glob('./*.jpg', { eager: true });
const studentPhotos = Object.values(images).map((img) => img.default);

export default studentPhotos;