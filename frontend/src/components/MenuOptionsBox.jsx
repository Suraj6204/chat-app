
const MenuOptionsBox = ({icon:Icon , label , onClick , iconColour ="", className = ""}) => {
  return (
    <button 
        type="button"
        className={`w-full cursor-pointer flex items-center gap-4 px-4 py-3 hover:bg-base-300 transition-colors ${className}`}
        onClick={(e) => {
            e.stopPropagation(); 
            onClick?.();
        }}
        >
        <Icon size={22}  className={iconColour}/>
        <span className="text-base-content font-medium text-sm text-left flex-1">{label}</span>
    </button>
  )
}

export default MenuOptionsBox