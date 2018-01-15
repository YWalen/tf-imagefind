from PIL import Image
import numpy as np
import tensorflow as tf
import os.path
import objectdetection
import piexif

curPath = os.getcwd()

print(curPath)

def load_image_into_numpy_array(image):
    (im_width, im_height) = image.size
    return np.array(image.getdata()).reshape(
        (im_height, im_width, 3)).astype(np.uint8)


def tag_image(image,tag):
    image_to_tag = Image.open(image)
    zeroth_ifd = {piexif.ImageIFD.ImageDescription: tag}
    exif_dict = {"0th": zeroth_ifd}
    exif_bytes = piexif.dump(exif_dict)
    image_to_tag.save(image, exif=exif_bytes)

IMAGES = []
path = curPath + "/temp_images/"
valid_images = (".jpg",".jpeg")
for f in os.listdir(path):
    ext = os.path.splitext(f)[1]
    if f.lower().endswith(valid_images):
        IMAGES.append(os.path.join(path, f))
TEST_IMAGE_PATHS = IMAGES


# Size, in inches, of the output images.
IMAGE_SIZE = (12, 8)

# What model to download.


results = []

file = open("temp.txt","w")

detection_graph = objectdetection.detection_graph

with detection_graph.as_default():
    with tf.Session(graph=detection_graph) as sess:
        # Definite input and output Tensors for detection_graph
        image_tensor = detection_graph.get_tensor_by_name('image_tensor:0')
        # Each box represents a part of the image where a particular object was detected.
        detection_boxes = detection_graph.get_tensor_by_name('detection_boxes:0')
        # Each score represent how level of confidence for each of the objects.
        # Score is shown on the result image, together with the class label.
        detection_scores = detection_graph.get_tensor_by_name('detection_scores:0')
        detection_classes = detection_graph.get_tensor_by_name('detection_classes:0')
        num_detections = detection_graph.get_tensor_by_name('num_detections:0')
        for image_path in TEST_IMAGE_PATHS:
            image_array = image_path.split("/")
            image_name = image_array[len(image_array)-1]
            results.append(image_name)
            image = Image.open(image_path)
            # the array based representation of the image will be used later in order to prepare the
            # result image with boxes and labels on it.
            image_np = load_image_into_numpy_array(image)
            # Expand dimensions since the model expects images to have shape: [1, None, None, 3]
            image_np_expanded = np.expand_dims(image_np, axis=0)
            # Actual detection.
            (boxes, scores, classes, num) = sess.run(
                [detection_boxes, detection_scores, detection_classes, num_detections],
                feed_dict={image_tensor: image_np_expanded})
            # Visualization of the results of a detection.
            results.append("|")
            objects = classes[scores > 0.5]
            tag = ""
            for obj in objects:
                detected = " " + str((objectdetection.category_index[obj]['name']))
                results.append(detected)
                tag += detected
            results.append("|")
            tag_image(image_path,tag)



for result in results:
    file.write(result)


