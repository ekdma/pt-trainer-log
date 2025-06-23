import { useEffect } from 'react';

export function useHorizontalDragScroll(containerRef: React.RefObject<HTMLElement | null>) {
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
  
      let isDown = false;
      let startX = 0;
      let scrollLeft = 0;
  
      const handleMouseDown = (e: MouseEvent) => {
        isDown = true;
        el.classList.add('cursor-grabbing');
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
      };
  
      const handleMouseLeave = () => {
        isDown = false;
        el.classList.remove('cursor-grabbing');
      };
  
      const handleMouseUp = () => {
        isDown = false;
        el.classList.remove('cursor-grabbing');
      };
  
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 1; // 속도 조절 가능
        el.scrollLeft = scrollLeft - walk;
      };
  
      el.addEventListener('mousedown', handleMouseDown);
      el.addEventListener('mouseleave', handleMouseLeave);
      el.addEventListener('mouseup', handleMouseUp);
      el.addEventListener('mousemove', handleMouseMove);
  
      return () => {
        el.removeEventListener('mousedown', handleMouseDown);
        el.removeEventListener('mouseleave', handleMouseLeave);
        el.removeEventListener('mouseup', handleMouseUp);
        el.removeEventListener('mousemove', handleMouseMove);
      };
    }, [containerRef]);
  }
  