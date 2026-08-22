import { Router } from "express";
import { validate } from "../middleware/validation";
import { authStaff, authCustomer, requireRoles } from "../middleware/auth";

// Import Controllers
import * as authCtrl from "../controllers/auth.controller";
import * as tableCtrl from "../controllers/table.controller";
import * as categoryCtrl from "../controllers/category.controller";
import * as menuCtrl from "../controllers/menu.controller";
import * as invCtrl from "../controllers/inventory.controller";
import * as customerCtrl from "../controllers/customer.controller";
import * as orderCtrl from "../controllers/order.controller";
import * as kotCtrl from "../controllers/kot.controller";
import * as billCtrl from "../controllers/bill.controller";
import * as queryCtrl from "../controllers/query.controller";
import * as leadCtrl from "../controllers/lead.controller";
import * as restCtrl from "../controllers/restaurant.controller";
import * as analyticsCtrl from "../controllers/analytics.controller";
import * as ratingCtrl from "../controllers/rating.controller";

// Import Schemas
import * as s from "@pos/schemas";

const router = Router();

// ==========================================
// 1. PUBLIC MARKETING & ONBOARDING ROUTES
// ==========================================
router.post("/public/leads", validate(s.leadCreateSchema), leadCtrl.createLead);
router.post("/restaurants", createTenantSanityCheck, restCtrl.createRestaurant);

// Helper function to allow restaurant signup
function createTenantSanityCheck(req: any, res: any, next: any) {
  // Can be extended to restrict tenant self-onboarding if needed
  next();
}

// ==========================================
// 2. STAFF AUTHENTICATION ROUTES
// ==========================================
router.post("/auth/login", validate(s.loginSchema), authCtrl.loginStaff);
router.post("/auth/refresh", authCtrl.refreshStaffToken);
router.post("/auth/logout", authCtrl.logoutStaff);

// ==========================================
// 3. STAFF PROFILE & MANAGEMENT
// ==========================================
router.get("/restaurants/:id", authStaff, restCtrl.getRestaurantById);
router.patch("/restaurants/:id", authStaff, validate(s.restaurantSchema), restCtrl.updateRestaurant);
router.post("/auth/register-staff", authStaff, requireRoles(["owner", "manager"]), validate(s.staffRegisterSchema), authCtrl.registerStaff);

// ==========================================
// 4. TABLE & QR MANAGEMENT ROUTES
// ==========================================
router.get("/restaurants/:id/tables", authStaff, tableCtrl.getTables);
router.post("/restaurants/:id/tables", authStaff, requireRoles(["owner", "manager"]), validate(s.tableSchema), tableCtrl.createTable);
router.patch("/tables/:tableId", authStaff, requireRoles(["owner", "manager", "waiter"]), validate(s.tableSchema.partial()), tableCtrl.updateTable);
router.delete("/tables/:tableId", authStaff, requireRoles(["owner"]), tableCtrl.deleteTable);
router.post("/tables/:tableId/regenerate-qr", authStaff, requireRoles(["owner", "manager"]), tableCtrl.regenerateTableQR);

// Public table resolution for customer landing (PWA scan)
router.get("/public/r/:slug/t/:qrToken", tableCtrl.resolveTableQR);

// ==========================================
// 5. CATEGORIES ROUTES
// ==========================================
router.get("/restaurants/:restaurantId/categories", categoryCtrl.getCategories); // Public/Staff readable
router.post("/restaurants/:id/categories", authStaff, requireRoles(["owner", "manager"]), validate(s.categorySchema), categoryCtrl.createCategory);
router.patch("/categories/:categoryId", authStaff, requireRoles(["owner", "manager"]), validate(s.categorySchema.partial()), categoryCtrl.updateCategory);
router.delete("/categories/:categoryId", authStaff, requireRoles(["owner"]), categoryCtrl.deleteCategory);

// ==========================================
// 6. MENU ITEMS ROUTES
// ==========================================
router.get("/restaurants/:restaurantId/menu-items", menuCtrl.getMenuItems); // Public/Staff readable
router.post("/restaurants/:id/menu-items", authStaff, requireRoles(["owner", "manager"]), validate(s.menuItemSchema), menuCtrl.createMenuItem);
router.patch("/menu-items/:id", authStaff, requireRoles(["owner", "manager"]), validate(s.menuItemSchema.partial()), menuCtrl.updateMenuItem);
router.delete("/menu-items/:id", authStaff, requireRoles(["owner"]), menuCtrl.deleteMenuItem);
router.patch("/menu-items/:id/toggle-stock", authStaff, requireRoles(["owner", "manager", "chef"]), menuCtrl.toggleStockStatus);

// ==========================================
// 7. INGREDIENTS / INVENTORY ROUTES
// ==========================================
router.get("/restaurants/:id/ingredients", authStaff, requireRoles(["owner", "manager", "chef"]), invCtrl.getIngredients);
router.post("/restaurants/:id/ingredients", authStaff, requireRoles(["owner", "manager"]), validate(s.ingredientSchema), invCtrl.createIngredient);
router.patch("/ingredients/:id", authStaff, requireRoles(["owner", "manager"]), validate(s.ingredientSchema.partial()), invCtrl.updateIngredient);
router.delete("/ingredients/:id", authStaff, requireRoles(["owner"]), invCtrl.deleteIngredient);
router.post("/ingredients/:id/adjust-stock", authStaff, requireRoles(["owner", "manager", "chef"]), validate(s.stockAdjustmentSchema), invCtrl.adjustStock);

// ==========================================
// 8. CUSTOMER SESSION ROUTE
// ==========================================
router.post("/public/customers", validate(s.customerSessionSchema), customerCtrl.getOrCreateCustomerSession);

// ==========================================
// 9. ORDERS ROUTES
// ==========================================
router.post("/public/orders", authCustomer, validate(s.orderCreateSchema), orderCtrl.createOrder); // placed by customer
router.get("/restaurants/:id/orders", authStaff, orderCtrl.getOrders);
router.get("/orders/:id", authStaff, orderCtrl.getOrderById);
router.get("/public/orders/:id", authCustomer, orderCtrl.getOrderById); // customer status check
router.patch("/orders/:id/status", authStaff, requireRoles(["owner", "manager", "waiter"]), validate(s.orderStatusUpdateSchema), orderCtrl.updateOrderStatus);

// ==========================================
// 10. KOTS ROUTES
// ==========================================
router.get("/kots", authStaff, requireRoles(["owner", "manager", "chef", "waiter"]), kotCtrl.getKOTs);
router.patch("/kots/:id/status", authStaff, requireRoles(["owner", "manager", "chef"]), validate(s.kotStatusUpdateSchema), kotCtrl.updateKOTStatus);

// ==========================================
// 11. BILLING ROUTES
// ==========================================
router.post("/orders/:orderId/generate-bill", authStaff, requireRoles(["owner", "manager", "waiter"]), billCtrl.generateBill);
router.get("/orders/:orderId/bill", authStaff, billCtrl.getBillByOrderId);
router.get("/public/orders/:orderId/bill", authCustomer, billCtrl.getBillByOrderId); // customer bill display
router.post("/bills/:id/settle", authStaff, requireRoles(["owner", "manager", "waiter"]), billCtrl.settleBillPayment);

// ==========================================
// 12. TABLE QUERIES ("CALL WAITER")
// ==========================================
router.post("/public/table-queries", authCustomer, queryCtrl.createTableQuery); // called by customer
router.get("/table-queries", authStaff, requireRoles(["owner", "manager", "waiter"]), queryCtrl.getActiveQueries);
router.patch("/table-queries/:id/resolve", authStaff, requireRoles(["owner", "manager", "waiter"]), queryCtrl.resolveTableQuery);

// ==========================================
// 13. ANALYTICS ROUTES
// ==========================================
router.get("/restaurants/:id/analytics/summary", authStaff, requireRoles(["owner", "manager"]), analyticsCtrl.getSummary);
router.get("/restaurants/:id/analytics/revenue-chart", authStaff, requireRoles(["owner", "manager"]), analyticsCtrl.getRevenueChart);
router.get("/restaurants/:id/analytics/popular-items", authStaff, requireRoles(["owner", "manager"]), analyticsCtrl.getPopularItems);
router.get("/restaurants/:id/analytics/order-status", authStaff, requireRoles(["owner", "manager"]), analyticsCtrl.getOrderStatusBreakdown);
router.get("/restaurants/:id/analytics/busy-hours", authStaff, requireRoles(["owner", "manager"]), analyticsCtrl.getBusyHours);

// ==========================================
// 14. RATINGS ROUTES
// ==========================================
router.post("/public/orders/:id/rating", authCustomer, validate(s.orderRatingCreateSchema), ratingCtrl.createOrUpdateRating);
router.get("/public/orders/:id/rating", authCustomer, ratingCtrl.getRatingForOrder);
router.get("/restaurants/:id/ratings", authStaff, requireRoles(["owner", "manager"]), ratingCtrl.getRatings);
router.get("/restaurants/:id/ratings/overview", authStaff, requireRoles(["owner", "manager"]), ratingCtrl.getRatingsOverview);
router.get("/menu-items/:id/ratings", authStaff, ratingCtrl.getMenuItemRatings);
router.patch("/ratings/:id/resolve-followup", authStaff, requireRoles(["owner", "manager"]), ratingCtrl.resolveFollowUp);

export default router;
