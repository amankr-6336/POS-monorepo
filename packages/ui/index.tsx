import React from "react";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Class merger helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- BUTTON ---
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline" | "glass";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }: ButtonProps, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-xl transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:pointer-events-none",
          // Variants
          {
            "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-500/10 hover:shadow-lg hover:shadow-violet-500/20":
              variant === "primary",
            "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/50": variant === "secondary",
            "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/10": variant === "danger",
            "bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white": variant === "ghost",
            "border border-zinc-700 hover:bg-zinc-800 text-zinc-300": variant === "outline",
            "bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20": variant === "glass",
          },
          // Sizes
          {
            "px-3 py-1.5 text-xs": size === "sm",
            "px-5 py-2.5 text-sm": size === "md",
            "px-7 py-3 text-base": size === "lg",
            "p-2": size === "icon",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

// --- INPUT ---
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, ...props }: InputProps, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && <label className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">{label}</label>}
        <input
          type={type}
          ref={ref}
          className={cn(
            "w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 transition-all focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm",
            error && "border-red-500 focus:ring-red-500 focus:border-red-500",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";

// --- CARD ---
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Card: React.FC<CardProps> = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        "bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl shadow-black/5 hover:border-zinc-700/50 transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// --- BADGE ---
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "error" | "info" | "neutral" | "preparing" | "ready";
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = "neutral", children, ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
        {
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20": variant === "success",
          "bg-amber-500/10 text-amber-400 border border-amber-500/20": variant === "warning",
          "bg-rose-500/10 text-rose-400 border border-rose-500/20": variant === "error",
          "bg-violet-500/10 text-violet-400 border border-violet-500/20": variant === "info",
          "bg-zinc-800 text-zinc-400 border border-zinc-700": variant === "neutral",
          "bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse": variant === "preparing",
          "bg-pink-500/10 text-pink-400 border border-pink-500/20 shadow-sm shadow-pink-500/20": variant === "ready",
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

// --- MODAL ---
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = "md" }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Content */}
      <div className={cn(
        "relative w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col",
        {
          "max-w-md": size === "sm",
          "max-w-lg": size === "md",
          "max-w-xl": size === "lg",
          "max-w-2xl": size === "xl",
          "max-w-3xl": size === "2xl",
          "max-w-4xl": size === "3xl",
        }
      )}>
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="pt-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};

// --- ITEM CUSTOMIZER MODAL ---
export interface ItemCustomizerModalProps {
  item: any | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customizedItem: {
    menuItemId: string;
    name: string;
    basePrice: number;
    price: number;
    quantity: number;
    specialInstructions: string;
    imageUrl?: string;
    selectedVariant?: any;
    selectedVariants?: any[];
    selectedModifiers?: any[];
  }) => void;
}

export const ItemCustomizerModal: React.FC<ItemCustomizerModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selectedVariantOptions, setSelectedVariantOptions] = React.useState<{ [groupName: string]: any }>({});
  const [selectedModifierOptions, setSelectedModifierOptions] = React.useState<any[]>([]);
  const [customQuantity, setCustomQuantity] = React.useState(1);
  const [customInstructions, setCustomInstructions] = React.useState("");
  const [variantError, setVariantError] = React.useState("");

  React.useEffect(() => {
    if (item && isOpen) {
      setCustomQuantity(1);
      setCustomInstructions("");
      setVariantError("");
      setSelectedVariantOptions({});
      setSelectedModifierOptions([]);
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSelectVariantOption = (groupName: string, option: any) => {
    setSelectedVariantOptions((prev) => ({
      ...prev,
      [groupName]: {
        groupName,
        optionName: option.name,
        priceDelta: option.priceDelta || 0,
        ingredientOverrides: option.ingredientOverrides || [],
      },
    }));
    setVariantError("");
  };

  const handleToggleModifierOption = (group: any, option: any) => {
    if (group.multiSelect) {
      setSelectedModifierOptions((prev) => {
        const exists = prev.some((m) => m.groupName === group.name && m.optionName === option.name);
        if (exists) {
          return prev.filter((m) => !(m.groupName === group.name && m.optionName === option.name));
        } else {
          return [
            ...prev,
            {
              groupName: group.name,
              optionName: option.name,
              priceDelta: option.priceDelta || 0,
              ingredients: option.ingredients || [],
            },
          ];
        }
      });
    } else {
      setSelectedModifierOptions((prev) => {
        const otherGroupsMods = prev.filter((m) => m.groupName !== group.name);
        const exists = prev.some((m) => m.groupName === group.name && m.optionName === option.name);
        if (exists) {
          return otherGroupsMods;
        } else {
          return [
            ...otherGroupsMods,
            {
              groupName: group.name,
              optionName: option.name,
              priceDelta: option.priceDelta || 0,
              ingredients: option.ingredients || [],
            },
          ];
        }
      });
    }
  };

  // Compute live price delta and validation
  let missingVariantGroups: string[] = [];
  if (item.variantGroups && item.variantGroups.length > 0) {
    for (const vg of item.variantGroups) {
      if (vg.options && vg.options.length > 0 && !selectedVariantOptions[vg.name]) {
        missingVariantGroups.push(vg.name);
      }
    }
  }

  let unitPrice = item.price;
  for (const v of Object.values(selectedVariantOptions)) {
    if (v) unitPrice += v.priceDelta || 0;
  }
  for (const m of selectedModifierOptions) {
    if (m) unitPrice += m.priceDelta || 0;
  }
  unitPrice = Math.max(0, Math.round(unitPrice * 100) / 100);

  const handleConfirm = () => {
    if (missingVariantGroups.length > 0) {
      setVariantError(`Please select a ${missingVariantGroups.join(", ")} to continue`);
      return;
    }

    const snapshottedVariants = Object.values(selectedVariantOptions);
    const snapshottedModifiers = selectedModifierOptions;

    onConfirm({
      menuItemId: item._id,
      name: item.name,
      basePrice: item.price,
      price: unitPrice,
      quantity: customQuantity,
      specialInstructions: customInstructions,
      imageUrl: item.imageUrl,
      selectedVariant: snapshottedVariants[0] || undefined,
      selectedVariants: snapshottedVariants,
      selectedModifiers: snapshottedModifiers,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 no-print">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col w-full max-w-lg shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/40">
          <div>
            <h3 className="font-extrabold text-white text-base sm:text-lg">{item.name}</h3>
            <span className="text-xs text-violet-400 font-bold">Base: ${item.price.toFixed(2)}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Customization Options */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {item.imageUrl && (
            <div className="w-full h-36 rounded-2xl overflow-hidden border border-zinc-850 shrink-0">
              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            </div>
          )}
          {item.description && (
            <p className="text-xs text-zinc-400 leading-relaxed font-light">{item.description}</p>
          )}

          {variantError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <span className="font-bold">⚠️</span>
              <span>{variantError}</span>
            </div>
          )}

          {/* Variant Groups (Required Single-Choice) */}
          {item.variantGroups?.map((vg: any, gIdx: number) => {
            const currentSelected = selectedVariantOptions[vg.name];

            return (
              <div key={gIdx} className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">{vg.name}</h4>
                    <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Required
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">Choose 1</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {vg.options.map((opt: any, oIdx: number) => {
                    const isSelected = currentSelected?.optionName === opt.name;

                    return (
                      <button
                        type="button"
                        key={oIdx}
                        onClick={() => handleSelectVariantOption(vg.name, opt)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                          isSelected
                            ? "bg-violet-950/40 border-violet-500 shadow-sm shadow-violet-500/20 text-white"
                            : "bg-zinc-900/40 border-zinc-850 hover:border-zinc-700 text-zinc-300"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                              isSelected ? "border-violet-400 bg-violet-600" : "border-zinc-600 bg-zinc-950"
                            )}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-xs font-bold">{opt.name}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-violet-400">
                          {opt.priceDelta > 0 ? `+$${opt.priceDelta.toFixed(2)}` : opt.priceDelta < 0 ? `-$${Math.abs(opt.priceDelta).toFixed(2)}` : "Included"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Modifier Groups (Optional Add-ons) */}
          {item.modifierGroups?.map((mg: any, gIdx: number) => (
            <div key={gIdx} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">{mg.name}</h4>
                  <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {mg.multiSelect ? "Multi-select" : "Single choice"}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500">Optional</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mg.options.map((opt: any, oIdx: number) => {
                  const isSelected = selectedModifierOptions.some(
                    (m) => m.groupName === mg.name && m.optionName === opt.name
                  );

                  return (
                    <button
                      type="button"
                      key={oIdx}
                      onClick={() => handleToggleModifierOption(mg, opt)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                        isSelected
                          ? "bg-emerald-950/40 border-emerald-500/80 shadow-sm shadow-emerald-500/10 text-white"
                          : "bg-zinc-900/40 border-zinc-850 hover:border-zinc-700 text-zinc-300"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            "w-4 h-4 rounded-md border flex items-center justify-center shrink-0",
                            isSelected ? "border-emerald-400 bg-emerald-600" : "border-zinc-600 bg-zinc-950"
                          )}
                        >
                          {isSelected && <span className="text-[10px] text-white font-black">✓</span>}
                        </div>
                        <span className="text-xs font-bold">{opt.name}</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {opt.priceDelta > 0 ? `+$${opt.priceDelta.toFixed(2)}` : "Free"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special Instructions Note */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Special Cooking Notes</h4>
            <textarea
              placeholder="e.g. Extra spicy, no onions, dressing on side..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={2}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-zinc-850 bg-zinc-900/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
            >
              -
            </button>
            <span className="text-sm font-bold text-white w-6 text-center">{customQuantity}</span>
            <button
              onClick={() => setCustomQuantity(customQuantity + 1)}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
            >
              +
            </button>
          </div>

          <Button
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold shadow-lg shadow-violet-500/20"
          >
            <span>Add to Order</span>
            <span className="opacity-75">|</span>
            <span>${(unitPrice * customQuantity).toFixed(2)}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- CART DRAWER ---
export interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onUpdateQuantity: (idOrMenuItemId: string, quantity: number) => void;
  onUpdateInstructions: (idOrMenuItemId: string, instructions: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  title?: string;
  submitLabel?: string;
  notes?: string;
  onNotesChange?: (notes: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onUpdateInstructions,
  onSubmit,
  submitting = false,
  title = "Your Cart",
  submitLabel = "Place Kitchen Order",
  notes = "",
  onNotesChange,
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end no-print">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-h-[88vh] flex flex-col w-full max-w-lg mx-auto shadow-2xl overflow-hidden z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-lg">{title}</h3>
            <Badge variant="info">{items.length}</Badge>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {items.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <p className="text-sm">No items in cart</p>
            </div>
          ) : (
            items.map((item) => {
              const itemKey = item.id || item.menuItemId;
              const variants = item.selectedVariants && item.selectedVariants.length > 0
                ? item.selectedVariants
                : item.selectedVariant
                ? [item.selectedVariant]
                : [];
              const modifiers = item.selectedModifiers || [];

              return (
                <div key={itemKey} className="flex gap-4 p-3 bg-zinc-900/40 rounded-2xl border border-zinc-900/80">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-800" />
                  )}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-white">{item.name}</h4>
                        {variants.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {variants.map((v: any, vIdx: number) => (
                              <span key={vIdx} className="text-[10px] font-semibold text-violet-300 bg-violet-950/60 border border-violet-800/60 px-1.5 py-0.2 rounded">
                                {v.groupName ? `${v.groupName}: ` : ""}{v.optionName}
                              </span>
                            ))}
                          </div>
                        )}
                        {modifiers.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {modifiers.map((m: any, mIdx: number) => (
                              <span key={mIdx} className="text-[10px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                                + {m.optionName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-extrabold text-violet-400 font-mono">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>

                    <div className="mt-1">
                      <input
                        type="text"
                        placeholder="Add cooking notes..."
                        value={item.specialInstructions || ""}
                        onChange={(e) => onUpdateInstructions(itemKey, e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
                      />
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <button
                        onClick={() => onUpdateQuantity(itemKey, 0)}
                        className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                      >
                        Remove
                      </button>
                      <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-0.5">
                        <button
                          onClick={() => onUpdateQuantity(itemKey, item.quantity - 1)}
                          className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-white w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(itemKey, item.quantity + 1)}
                          className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {onNotesChange && (
            <div className="mt-2">
              <label className="text-[10px] uppercase font-bold text-zinc-400">Order Note / Table Remarks</label>
              <input
                type="text"
                placeholder="e.g. VIP guests, allergy warning..."
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                className="w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {items.length > 0 && (
          <div className="p-5 border-t border-zinc-900 bg-zinc-900/20">
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex justify-between text-zinc-400 text-xs">
                <span>Subtotal</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-xs font-light">
                <span>Tax (5% GST)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white font-extrabold text-base pt-2 border-t border-zinc-900/60 mt-1">
                <span>Total</span>
                <span className="text-violet-400">${total.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={onSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold shadow-lg shadow-violet-500/10"
            >
              {submitting ? "Processing..." : submitLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

