"""ORM models. Importing this package registers all models on `Base`."""

from app.models.brand_metadata import BrandMetadata
from app.models.deal import MarketDeal
from app.models.dealer import Dealer
from app.models.inventory import InventoryListing
from app.models.leasehackr import LhCrawlLog, LhKnowledgeChunk
from app.models.program import OemIncentive, OemProgram
from app.models.reference import Province, VehicleMake, VehicleModel, VehicleTrim

__all__ = [
    "BrandMetadata",
    "Dealer",
    "InventoryListing",
    "LhCrawlLog",
    "LhKnowledgeChunk",
    "MarketDeal",
    "OemIncentive",
    "OemProgram",
    "Province",
    "VehicleMake",
    "VehicleModel",
    "VehicleTrim",
]
