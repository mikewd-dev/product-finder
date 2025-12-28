import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import '../../src/styles/DragDrop.css'

const DragNDrop = ({ onDrop }) => {
  const [{ isOver }, drop] = useDrop({
    accept: [NativeTypes.FILE],
    drop: (item) => {
      if (item.files && item.files.length > 0) {
        onDrop(item.files[0]);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  return (
    <div className='drag-drop-container'>
    <div ref={drop} className='drag-drop'>
      <p className='center-text-drag'>Drop an image here</p>
    </div>

    </div>
  );
};

export default DragNDrop;
