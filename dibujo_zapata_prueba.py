"""Prueba básica de dibujo: planta y corte de una zapata aislada (medidas de ejemplo)."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

B, L = 2.0, 2.0          # zapata: ancho y largo (m)
bc = 0.4                 # columna cuadrada (m)
h = 0.5                  # peralte de la zapata (m)

fig, (planta, corte) = plt.subplots(1, 2, figsize=(10, 5))

# Planta
planta.add_patch(Rectangle((-B/2, -L/2), B, L, fill=False, lw=2, color="black"))
planta.add_patch(Rectangle((-bc/2, -bc/2), bc, bc, color="gray", alpha=0.6))
planta.annotate("", xy=(B/2, -L/2 - 0.2), xytext=(-B/2, -L/2 - 0.2),
                arrowprops=dict(arrowstyle="<->"))
planta.text(0, -L/2 - 0.35, f"B = {B:.2f} m", ha="center")
planta.set_title("Planta")
planta.set_aspect("equal")
planta.axis("off")

# Corte
corte.add_patch(Rectangle((-B/2, 0), B, h, fill=False, lw=2, color="black"))
corte.add_patch(Rectangle((-bc/2, h), bc, 1.0, color="gray", alpha=0.6))
corte.annotate("", xy=(B/2 + 0.2, 0), xytext=(B/2 + 0.2, h),
               arrowprops=dict(arrowstyle="<->"))
corte.text(B/2 + 0.3, h/2, f"h = {h:.2f} m", va="center")
corte.set_title("Corte")
corte.set_xlim(-B, B + 0.8)
corte.set_ylim(-0.3, 2.0)
corte.set_aspect("equal")
corte.axis("off")

fig.suptitle("Zapata aislada - prueba de dibujo")
fig.savefig("dibujo_zapata_prueba.png", dpi=120, bbox_inches="tight")
print("Guardado: dibujo_zapata_prueba.png")
