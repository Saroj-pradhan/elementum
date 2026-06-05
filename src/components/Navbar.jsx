import React from 'react'
import { NavLink } from 'react-router-dom';
function Navbar() {
  return (
    <div className='w-[100%] h-12 flex justify-between pl-5 sm:pl-12 pr-5 sm:pr-12  items-center '>
        <div>
            <p className='font-["Gerbil"] font-[46px]'>Elementum</p>
        </div>
        <div className='hidden md:flex gap-8 '>
            <NavLink className='font-["satoshi"]' to="#">Home</NavLink>
            <NavLink className='font-["satoshi"]' to="#">Studio</NavLink>
            <NavLink className='font-["satoshi"]' to="#">Services</NavLink>
            <NavLink className='font-["satoshi"]' to="#">Contact</NavLink>
            <NavLink className='font-["satoshi"]' to="#">FAQ's</NavLink>
        </div>
        <div>
          <svg width="46" height="13" viewBox="0 0 46 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<line y1="1" x2="45.3555" y2="1" stroke="black" stroke-width="2"/>
<line y1="11.5" x2="45.3555" y2="11.5" stroke="black" stroke-width="2"/>
</svg>

        </div>
    </div>
  )
}

export default Navbar